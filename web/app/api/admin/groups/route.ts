import { NextResponse } from "next/server";

import {
  proxyBackendAdminGet,
  proxyBackendAdminPost,
} from "@/shared/server/backend-admin-proxy";

export async function GET(request: Request): Promise<Response> {
  return proxyBackendAdminGet({
    request,
    path: "/groups",
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await request.json();
    return proxyBackendAdminPost({
      request,
      path: "/groups",
      payload,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }
}
