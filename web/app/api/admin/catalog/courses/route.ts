import { NextResponse } from "next/server";

import { proxyBackendAdminPost } from "@/shared/server/backend-admin-proxy";

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await request.json();
    return proxyBackendAdminPost({
      request,
      path: "/catalog/courses",
      payload,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }
}
