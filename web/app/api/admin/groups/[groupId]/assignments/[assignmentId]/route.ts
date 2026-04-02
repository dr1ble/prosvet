import { NextResponse } from "next/server";

import { proxyBackendAdminPatch } from "@/shared/server/backend-admin-proxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string; assignmentId: string }> },
): Promise<Response> {
  const { groupId, assignmentId } = await params;
  try {
    const payload = await request.json();
    return proxyBackendAdminPatch({
      request,
      path: `/groups/${groupId}/assignments/${assignmentId}`,
      payload,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }
}
