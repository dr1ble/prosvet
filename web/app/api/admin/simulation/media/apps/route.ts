import { NextResponse } from "next/server";

import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { apiBaseUrl } from "@/shared/config";
import { getRequestCookie } from "@/shared/server/request-cookies";

function resolveAdminAccessToken(request: Request): string | null {
  return getRequestCookie(request, ADMIN_ACCESS_COOKIE) ?? null;
}

function sanitizeScopeKey(value: string | null): string {
  const normalized = (value ?? "").trim();
  if (!normalized) {
    return "global";
  }
  return normalized.slice(0, 190);
}

function sanitizeSearch(value: string | null): string {
  return (value ?? "").trim().slice(0, 120);
}

function sanitizeLimit(value: string | null): string {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  if (Number.isNaN(parsed)) {
    return "40";
  }
  if (parsed < 1) {
    return "1";
  }
  if (parsed > 100) {
    return "100";
  }
  return String(parsed);
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
    search_query: sanitizeSearch(url.searchParams.get("search_query")),
    limit: sanitizeLimit(url.searchParams.get("limit")),
  });

  let backendResponse: Response;
  try {
    backendResponse = await fetch(
      `${apiBaseUrl}/simulation/media/apps?${query.toString()}`,
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

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(
      `${apiBaseUrl}/simulation/media/apps?${new URLSearchParams({
        scope_key: scopeKey,
      }).toString()}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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
