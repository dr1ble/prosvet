import { NextResponse } from "next/server";

import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { apiBaseUrl } from "@/shared/config";
import { getRequestCookie } from "@/shared/server/request-cookies";

function resolveAdminAccessToken(request: Request): string | null {
  return (
    getRequestCookie(request, ADMIN_ACCESS_COOKIE) ??
    process.env.WEB_ADMIN_ACCESS_TOKEN ??
    null
  );
}

function sanitizeScopeKey(value: string | null): string {
  const normalized = (value ?? "").trim();
  if (!normalized) {
    return "global";
  }
  return normalized.slice(0, 190);
}

function sanitizePackageName(value: string | null): string {
  return (value ?? "").trim().slice(0, 255);
}

function sanitizeStoreType(value: string | null): string {
  const normalized = (value ?? "").trim();
  if (
    normalized === "play_market" ||
    normalized === "rustore" ||
    normalized === "app_store"
  ) {
    return normalized;
  }
  return "other";
}

function sanitizeVersion(value: string | null): string {
  return (value ?? "").trim().slice(0, 40);
}

function sanitizeReleasedAt(value: string | null): string {
  return (value ?? "").trim().slice(0, 20);
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
      { detail: raw },
      { status: backendResponse.status },
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  const accessToken = resolveAdminAccessToken(request);
  if (!accessToken) {
    return NextResponse.json(
      { detail: "Admin session token is missing. Sign in again." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const query = new URLSearchParams({
    scope_key: sanitizeScopeKey(url.searchParams.get("scope_key")),
    search_query: (url.searchParams.get("search_query") ?? "").trim(),
    limit: (url.searchParams.get("limit") ?? "80").trim() || "80",
    app_package_name: sanitizePackageName(
      url.searchParams.get("app_package_name"),
    ),
    store_type: sanitizeStoreType(url.searchParams.get("store_type")),
    min_supported_version: sanitizeVersion(
      url.searchParams.get("min_supported_version"),
    ),
    max_supported_version: sanitizeVersion(
      url.searchParams.get("max_supported_version"),
    ),
  });
  const releasedAt = sanitizeReleasedAt(url.searchParams.get("released_at"));
  if (releasedAt) {
    query.set("released_at", releasedAt);
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(
      `${apiBaseUrl}/simulation/media?${query.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to connect to backend API.";
    return NextResponse.json({ detail: message }, { status: 502 });
  }

  return toJsonResponse(backendResponse);
}

export async function POST(request: Request): Promise<Response> {
  const accessToken = resolveAdminAccessToken(request);
  if (!accessToken) {
    return NextResponse.json(
      { detail: "Admin session token is missing. Sign in again." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const scopeKey = sanitizeScopeKey(url.searchParams.get("scope_key"));
  const query = new URLSearchParams({
    scope_key: scopeKey,
    app_package_name: sanitizePackageName(
      url.searchParams.get("app_package_name"),
    ),
    store_type: sanitizeStoreType(url.searchParams.get("store_type")),
    min_supported_version: sanitizeVersion(
      url.searchParams.get("min_supported_version"),
    ),
    max_supported_version: sanitizeVersion(
      url.searchParams.get("max_supported_version"),
    ),
  });
  const releasedAt = sanitizeReleasedAt(url.searchParams.get("released_at"));
  if (releasedAt) {
    query.set("released_at", releasedAt);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { detail: "Invalid form-data payload." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "file is required." }, { status: 422 });
  }

  const upstreamFormData = new FormData();
  upstreamFormData.set("file", file);

  let backendResponse: Response;
  try {
    backendResponse = await fetch(
      `${apiBaseUrl}/simulation/media/upload?${query.toString()}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: upstreamFormData,
        cache: "no-store",
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to connect to backend API.";
    return NextResponse.json({ detail: message }, { status: 502 });
  }

  return toJsonResponse(backendResponse);
}
