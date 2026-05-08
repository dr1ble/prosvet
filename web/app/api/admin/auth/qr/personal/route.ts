import { NextResponse } from "next/server";

import { proxyBackendAdminPost } from "@/shared/server/backend-admin-proxy";

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await request.json();
    return proxyBackendAdminPost({
      request,
      path: "/auth/qr/personal",
      payload,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid request payload." },
      { status: 400 },
    );
  }
}
