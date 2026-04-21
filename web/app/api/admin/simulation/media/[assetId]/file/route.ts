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

export async function GET(
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
    backendResponse = await fetch(
      `${apiBaseUrl}/simulation/media/${assetId}/file`,
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

  if (!backendResponse.ok) {
    const raw = await backendResponse.text();
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

  const data = await backendResponse.arrayBuffer();
  const headers = new Headers();
  const contentType =
    backendResponse.headers.get("content-type") ?? "application/octet-stream";
  headers.set("content-type", contentType);

  const contentDisposition = backendResponse.headers.get("content-disposition");
  if (contentDisposition) {
    headers.set("content-disposition", contentDisposition);
  }

  return new Response(data, {
    status: backendResponse.status,
    headers,
  });
}
