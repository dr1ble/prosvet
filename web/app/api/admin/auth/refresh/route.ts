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

export async function POST(request: Request): Promise<Response> {
  const refreshToken = getRequestCookie(request, ADMIN_REFRESH_COOKIE);
  if (!refreshToken) {
    return NextResponse.json(
      { detail: "Refresh token is missing." },
      { status: 401 },
    );
  }

  const backendResult = await postBackendAuthJson({
    path: "/auth/refresh",
    payload: {
      refresh_token: refreshToken,
    },
  });

  const response = NextResponse.json(backendResult.body, {
    status: backendResult.status,
  });

  if (backendResult.status >= 200 && backendResult.status < 300) {
    if (!isAuthTokensPayload(backendResult.body)) {
      return NextResponse.json(
        { detail: "Unexpected auth response format." },
        { status: 502 },
      );
    }

    const secure = resolveSecureCookieFlag(request);
    response.cookies.set({
      name: ADMIN_ACCESS_COOKIE,
      value: backendResult.body.access_token,
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
    });
    response.cookies.set({
      name: ADMIN_REFRESH_COOKIE,
      value: backendResult.body.refresh_token,
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}
