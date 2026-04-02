import { NextResponse } from "next/server";

import {
  proxyBackendAdminGet,
  proxyBackendAdminJson,
} from "@/shared/server/backend-admin-proxy";

export async function GET(request: Request): Promise<Response> {
  return proxyBackendAdminGet({
    request,
    path: "/rbac/policies",
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await request.json();
    return proxyBackendAdminJson({
      request,
      method: "POST",
      path: "/rbac/policies",
      payload,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }
}
