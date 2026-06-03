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

export async function DELETE(
  request: Request,
  context: { params: Promise<{ appPackageName: string }> },
): Promise<Response> {
  const accessToken = resolveAdminAccessToken(request);
  if (!accessToken) {
    return NextResponse.json(
      { detail: "Admin session token is missing. Sign in again." },
      { status: 401 },
    );
  }

  const { appPackageName } = await context.params;
  const url = new URL(request.url);
  const query = new URLSearchParams({
    scope_key: sanitizeScopeKey(url.searchParams.get("scope_key")),
  });

  let backendResponse: Response;
  try {
    backendResponse = await fetch(
      `${apiBaseUrl}/simulation/media/apps/${encodeURIComponent(appPackageName)}?${query.toString()}`,
      {
        method: "DELETE",
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
