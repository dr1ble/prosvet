import { NextResponse } from "next/server";

import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { apiBaseUrl } from "@/shared/config";
import { getRequestCookie } from "@/shared/server/request-cookies";

type RouteParams = {
  params: Promise<{
    assetId: string;
  }>;
};

type MediaAssetPatchPayload = Partial<{
  original_filename: string | null;
  app_package_name: string | null;
  store_type: string | null;
  min_supported_version: string | null;
  max_supported_version: string | null;
  released_at: string | null;
}>;

function resolveAdminAccessToken(request: Request): string | null {
  return getRequestCookie(request, ADMIN_ACCESS_COOKIE) ?? null;
}

function sanitizeFilename(value: string): string {
  return value
    .trim()
    .replace(/[\\/\x00]+/g, "_")
    .slice(0, 255);
}

function sanitizeText(
  value: string | null | undefined,
  maxLength: number,
): string {
  return (value ?? "").trim().slice(0, maxLength);
}

async function toJsonResponse(backendResponse: Response): Promise<Response> {
  const raw = await backendResponse.text();
  if (!raw) {
    return NextResponse.json({}, { status: backendResponse.status });
  }

  try {
    return NextResponse.json(JSON.parse(raw), {
      status: backendResponse.status,
    });
  } catch {
    return NextResponse.json(
      { detail: raw || backendResponse.statusText },
      { status: backendResponse.status },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const accessToken = resolveAdminAccessToken(request);
  if (!accessToken) {
    return NextResponse.json(
      { detail: "Admin session token is missing. Sign in again." },
      { status: 401 },
    );
  }

  const { assetId } = await params;
  if (!assetId) {
    return NextResponse.json(
      { detail: "assetId is required." },
      { status: 400 },
    );
  }

  let payload: MediaAssetPatchPayload | null = null;
  try {
    payload = (await request.json()) as MediaAssetPatchPayload;
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const forwardedPayload: MediaAssetPatchPayload = {};

  if (payload?.original_filename !== undefined) {
    const originalFilename = sanitizeFilename(payload.original_filename ?? "");
    if (!originalFilename) {
      return NextResponse.json(
        { detail: "original_filename is required." },
        { status: 422 },
      );
    }
    forwardedPayload.original_filename = originalFilename;
  }

  if (payload?.app_package_name !== undefined) {
    const appPackageName = sanitizeText(payload.app_package_name, 255);
    if (!appPackageName) {
      return NextResponse.json(
        { detail: "app_package_name is required." },
        { status: 422 },
      );
    }
    forwardedPayload.app_package_name = appPackageName;
  }

  if (payload?.store_type !== undefined) {
    const storeType = sanitizeText(payload.store_type, 30);
    if (!storeType) {
      return NextResponse.json(
        { detail: "store_type is required." },
        { status: 422 },
      );
    }
    forwardedPayload.store_type = storeType;
  }

  if (payload?.min_supported_version !== undefined) {
    const minSupportedVersion = sanitizeText(payload.min_supported_version, 40);
    if (!minSupportedVersion) {
      return NextResponse.json(
        { detail: "min_supported_version is required." },
        { status: 422 },
      );
    }
    forwardedPayload.min_supported_version = minSupportedVersion;
  }

  if (payload?.max_supported_version !== undefined) {
    const maxSupportedVersion = sanitizeText(payload.max_supported_version, 40);
    if (!maxSupportedVersion) {
      return NextResponse.json(
        { detail: "max_supported_version is required." },
        { status: 422 },
      );
    }
    forwardedPayload.max_supported_version = maxSupportedVersion;
  }

  if (payload?.released_at !== undefined) {
    const releasedAt = sanitizeText(payload.released_at, 20);
    forwardedPayload.released_at = releasedAt || null;
  }

  if (Object.keys(forwardedPayload).length === 0) {
    return NextResponse.json(
      { detail: "At least one update field is required." },
      { status: 422 },
    );
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${apiBaseUrl}/simulation/media/${assetId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(forwardedPayload),
      cache: "no-store",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to connect to backend API.";
    return NextResponse.json({ detail: message }, { status: 502 });
  }

  return toJsonResponse(backendResponse);
}

export async function DELETE(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const accessToken = resolveAdminAccessToken(request);
  if (!accessToken) {
    return NextResponse.json(
      { detail: "Admin session token is missing. Sign in again." },
      { status: 401 },
    );
  }

  const { assetId } = await params;
  if (!assetId) {
    return NextResponse.json(
      { detail: "assetId is required." },
      { status: 400 },
    );
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${apiBaseUrl}/simulation/media/${assetId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to connect to backend API.";
    return NextResponse.json({ detail: message }, { status: 502 });
  }

  if (backendResponse.status === 204) {
    return new Response(null, { status: 204 });
  }
  return toJsonResponse(backendResponse);
}
