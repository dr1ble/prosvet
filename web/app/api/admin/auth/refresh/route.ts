import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
} from "@/shared/auth/cookies";
import { resolveSecureCookieFlag } from "@/shared/auth/cookie-security";
import { postBackendAuthJson } from "@/shared/server/backend-auth-proxy";
import { getRequestCookie } from "@/shared/server/request-cookies";
import { resolveLanguage, type AppLanguage } from "@/shared/i18n/lang";

type AuthTokensPayload = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

function isAuthTokensPayload(value: unknown): value is AuthTokensPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.access_token === "string" &&
    typeof record.refresh_token === "string" &&
    typeof record.token_type === "string"
  );
}

function writeAuthCookies(
  response: NextResponse,
  request: Request,
  payload: AuthTokensPayload,
): void {
  const secure = resolveSecureCookieFlag(request);
  response.cookies.set({
    name: ADMIN_ACCESS_COOKIE,
    value: payload.access_token,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
  });
  response.cookies.set({
    name: ADMIN_REFRESH_COOKIE,
    value: payload.refresh_token,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
}

function clearAuthCookies(response: NextResponse, request: Request): void {
  const secure = resolveSecureCookieFlag(request);
  response.cookies.set({
    name: ADMIN_ACCESS_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set({
    name: ADMIN_REFRESH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
}

function resolveSafeNextPath(
  nextPath: string | null,
  language: AppLanguage,
): string {
  const fallback = `/dashboard?lang=${language}`;
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return fallback;
  }

  try {
    const normalized = new URL(nextPath, "http://localhost");
    return `${normalized.pathname}${normalized.search}`;
  } catch {
    return fallback;
  }
}

async function refreshViaBackend(request: Request): Promise<{
  status: number;
  body: unknown;
  tokens: AuthTokensPayload | null;
}> {
  const refreshToken = getRequestCookie(request, ADMIN_REFRESH_COOKIE);
  if (!refreshToken) {
    return {
      status: 401,
      body: { detail: "Refresh token is missing." },
      tokens: null,
    };
  }

  const backendResult = await postBackendAuthJson({
    path: "/auth/refresh",
    payload: {
      refresh_token: refreshToken,
    },
  });
  const tokens = isAuthTokensPayload(backendResult.body)
    ? backendResult.body
    : null;
  return {
    status: backendResult.status,
    body: backendResult.body,
    tokens,
  };
}

export async function POST(request: Request): Promise<Response> {
  const refreshed = await refreshViaBackend(request);
  if (refreshed.status >= 200 && refreshed.status < 300 && !refreshed.tokens) {
    return NextResponse.json(
      { detail: "Unexpected auth response format." },
      { status: 502 },
    );
  }

  const response = NextResponse.json(refreshed.body, {
    status: refreshed.status,
  });
  if (refreshed.tokens) {
    writeAuthCookies(response, request, refreshed.tokens);
  } else if (refreshed.status === 401) {
    clearAuthCookies(response, request);
  }
  return response;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const language = resolveLanguage(url.searchParams.get("lang"));
  const nextPath = resolveSafeNextPath(url.searchParams.get("next"), language);
  const refreshed = await refreshViaBackend(request);

  if (refreshed.status >= 200 && refreshed.status < 300 && refreshed.tokens) {
    const redirectTo = new URL(nextPath, request.url);
    const response = NextResponse.redirect(redirectTo);
    writeAuthCookies(response, request, refreshed.tokens);
    return response;
  }

  const authUrl = new URL(`/auth?lang=${language}`, request.url);
  const response = NextResponse.redirect(authUrl);
  clearAuthCookies(response, request);
  return response;
}
