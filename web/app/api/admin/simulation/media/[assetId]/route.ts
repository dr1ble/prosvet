import { NextResponse } from "next/server";

import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { apiBaseUrl } from "@/shared/config";
import { getRequestCookie } from "@/shared/server/request-cookies";

type RouteParams = {
  params: Promise<{
    assetId: string;
  }>;
};

function resolveAdminAccessToken(request: Request): string | null {
  return getRequestCookie(request, ADMIN_ACCESS_COOKIE) ?? null;
}

function sanitizeFilename(value: string): string {
  return value
    .trim()
    .replace(/[\\/\x00]+/g, "_")
    .slice(0, 255);
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

  let payload: { original_filename?: string } | null = null;
  try {
    payload = (await request.json()) as { original_filename?: string };
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const originalFilename = sanitizeFilename(payload?.original_filename ?? "");
  if (!originalFilename) {
    return NextResponse.json(
      { detail: "original_filename is required." },
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
      body: JSON.stringify({
        original_filename: originalFilename,
      }),
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
