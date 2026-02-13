import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
} from "@/shared/auth/cookies";
import { resolveSecureCookieFlag } from "@/shared/auth/cookie-security";
import { apiBaseUrl } from "@/shared/config";
import { postBackendAuthJson } from "@/shared/server/backend-auth-proxy";
import { getRequestCookie } from "@/shared/server/request-cookies";

type ProxyRequestBase = {
  request: Request;
  path: string;
};

type ProxyPostRequest = ProxyRequestBase & {
  payload: unknown;
};

type AuthTokensPayload = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

function resolveAdminAccessToken(request: Request): string | null {
  const accessToken =
    getRequestCookie(request, ADMIN_ACCESS_COOKIE) ??
    process.env.WEB_ADMIN_ACCESS_TOKEN;
  if (!accessToken) {
    return null;
  }
  return accessToken;
}

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

function responseFromBackend(
  backendResponse: Response,
  raw: string,
): NextResponse {
  // 204, 205, 304 are null-body statuses — Response constructor forbids a body
  const nullBodyStatuses = [204, 205, 304];
  if (nullBodyStatuses.includes(backendResponse.status)) {
    return new NextResponse(null, { status: backendResponse.status });
  }

  const contentType = backendResponse.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
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

  return new NextResponse(raw, { status: backendResponse.status });
}

async function tryRefreshAdminTokens(request: Request): Promise<{
  tokens: AuthTokensPayload | null;
  hadRefreshCookie: boolean;
}> {
  const refreshToken = getRequestCookie(request, ADMIN_REFRESH_COOKIE);
  if (!refreshToken) {
    return {
      tokens: null,
      hadRefreshCookie: false,
    };
  }

  const backendResult = await postBackendAuthJson({
    path: "/auth/refresh",
    payload: {
      refresh_token: refreshToken,
    },
  });
  if (
    backendResult.status >= 200 &&
    backendResult.status < 300 &&
    isAuthTokensPayload(backendResult.body)
  ) {
    return {
      tokens: backendResult.body,
      hadRefreshCookie: true,
    };
  }

  return {
    tokens: null,
    hadRefreshCookie: true,
  };
}

async function callBackendAdmin(
  path: string,
  method: HttpMethod,
  accessToken: string,
  payload?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (payload !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(`${apiBaseUrl}${path}`, {
    method,
    headers,
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
    cache: "no-store",
  });
}

async function proxyBackendAdminRequest({
  request,
  path,
  method,
  payload,
}: {
  request: Request;
  path: string;
  method: HttpMethod;
  payload?: unknown;
}): Promise<Response> {
  let accessToken = resolveAdminAccessToken(request);
  let refreshedTokens: AuthTokensPayload | null = null;

  if (!accessToken) {
    const refreshAttempt = await tryRefreshAdminTokens(request);
    if (!refreshAttempt.tokens) {
      const response = NextResponse.json(
        { detail: "Admin session token is missing. Sign in again." },
        { status: 401 },
      );
      return response;
    }
    refreshedTokens = refreshAttempt.tokens;
    accessToken = refreshAttempt.tokens.access_token;
  }

  let backendResponse: Response;
  try {
    backendResponse = await callBackendAdmin(
      path,
      method,
      accessToken,
      payload,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to connect to backend API.";
    return NextResponse.json({ detail: message }, { status: 502 });
  }

  if (backendResponse.status === 401) {
    const refreshAttempt = await tryRefreshAdminTokens(request);
    if (refreshAttempt.tokens) {
      refreshedTokens = refreshAttempt.tokens;
      accessToken = refreshAttempt.tokens.access_token;
      try {
        backendResponse = await callBackendAdmin(
          path,
          method,
          accessToken,
          payload,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to connect to backend API.";
        return NextResponse.json({ detail: message }, { status: 502 });
      }
    }
  }

  const raw = await backendResponse.text();
  const response = responseFromBackend(backendResponse, raw);
  if (refreshedTokens) {
    writeAuthCookies(response, request, refreshedTokens);
  }
  return response;
}

export async function proxyBackendAdminPost({
  request,
  path,
  payload,
}: ProxyPostRequest): Promise<Response> {
  return proxyBackendAdminRequest({
    request,
    path,
    method: "POST",
    payload,
  });
}

export async function proxyBackendAdminDelete({
  request,
  path,
}: ProxyRequestBase): Promise<Response> {
  return proxyBackendAdminRequest({
    request,
    path,
    method: "DELETE",
  });
}

export async function proxyBackendAdminGet({
  request,
  path,
}: ProxyRequestBase): Promise<Response> {
  return proxyBackendAdminRequest({
    request,
    path,
    method: "GET",
  });
}

export async function proxyBackendAdminPatch({
  request,
  path,
  payload,
}: ProxyPostRequest): Promise<Response> {
  return proxyBackendAdminRequest({
    request,
    path,
    method: "PATCH",
    payload,
  });
}
