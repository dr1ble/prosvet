import { NextResponse } from "next/server";

import { proxyBackendAdminPatch } from "@/shared/server/backend-admin-proxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
): Promise<Response> {
  const { groupId } = await params;
  try {
    const payload = await request.json();
    return proxyBackendAdminPatch({
      request,
      path: `/groups/${groupId}`,
      payload,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }
}
