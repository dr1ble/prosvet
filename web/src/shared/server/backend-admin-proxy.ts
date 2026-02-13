import { NextResponse } from "next/server";

import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { apiBaseUrl } from "@/shared/config";
import { getRequestCookie } from "@/shared/server/request-cookies";

type ProxyRequestBase = {
  request: Request;
  path: string;
};

type ProxyPostRequest = ProxyRequestBase & {
  payload: unknown;
};

function resolveAdminAccessToken(request: Request): string | null {
  const accessToken =
    getRequestCookie(request, ADMIN_ACCESS_COOKIE) ??
    process.env.WEB_ADMIN_ACCESS_TOKEN;
  if (!accessToken) {
    return null;
  }
  return accessToken;
}

function responseFromBackend(backendResponse: Response, raw: string): Response {
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

export async function proxyBackendAdminPost({
  request,
  path,
  payload,
}: ProxyPostRequest): Promise<Response> {
  const accessToken = resolveAdminAccessToken(request);
  if (!accessToken) {
    return NextResponse.json(
      { detail: "Admin session token is missing. Sign in again." },
      { status: 401 },
    );
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to connect to backend API.";
    return NextResponse.json({ detail: message }, { status: 502 });
  }

  const raw = await backendResponse.text();
  return responseFromBackend(backendResponse, raw);
}

export async function proxyBackendAdminGet({
  request,
  path,
}: ProxyRequestBase): Promise<Response> {
  const accessToken = resolveAdminAccessToken(request);
  if (!accessToken) {
    return NextResponse.json(
      { detail: "Admin session token is missing. Sign in again." },
      { status: 401 },
    );
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${apiBaseUrl}${path}`, {
      method: "GET",
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

  const raw = await backendResponse.text();
  return responseFromBackend(backendResponse, raw);
}

export async function proxyBackendAdminDelete({
  request,
  path,
}: ProxyRequestBase): Promise<Response> {
  const accessToken = resolveAdminAccessToken(request);
  if (!accessToken) {
    return NextResponse.json(
      { detail: "Admin session token is missing. Sign in again." },
      { status: 401 },
    );
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${apiBaseUrl}${path}`, {
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

  const raw = await backendResponse.text();
  return responseFromBackend(backendResponse, raw);
}

export async function proxyBackendAdminPatch({
  request,
  path,
  payload,
}: ProxyPostRequest): Promise<Response> {
  const accessToken = resolveAdminAccessToken(request);
  if (!accessToken) {
    return NextResponse.json(
      { detail: "Admin session token is missing. Sign in again." },
      { status: 401 },
    );
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${apiBaseUrl}${path}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to connect to backend API.";
    return NextResponse.json({ detail: message }, { status: 502 });
  }

  const raw = await backendResponse.text();
  return responseFromBackend(backendResponse, raw);
}
