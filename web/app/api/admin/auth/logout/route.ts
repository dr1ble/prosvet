import { NextResponse } from "next/server";

import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
} from "@/shared/auth/cookies";
import { resolveSecureCookieFlag } from "@/shared/auth/cookie-security";
import { postBackendAuthJson } from "@/shared/server/backend-auth-proxy";
import { getRequestCookie } from "@/shared/server/request-cookies";

export async function POST(request: Request): Promise<Response> {
  const refreshToken = getRequestCookie(request, ADMIN_REFRESH_COOKIE);

  if (refreshToken) {
    await postBackendAuthJson({
      path: "/auth/logout",
      payload: {
        refresh_token: refreshToken,
      },
    });
  }

  const response = NextResponse.json({ status: "logged_out" }, { status: 200 });
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
  return response;
}
