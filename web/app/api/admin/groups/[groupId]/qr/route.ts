import { NextResponse } from "next/server";

import { proxyBackendAdminPost } from "@/shared/server/backend-admin-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<unknown> },
): Promise<Response> {
  const { groupId } = (await context.params) as { groupId: string };
  try {
    return proxyBackendAdminPost({
      request,
      path: `/groups/${groupId}/qr`,
      payload: {},
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid request payload." },
      { status: 400 },
    );
  }
}
