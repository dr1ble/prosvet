import { NextResponse } from "next/server";

import {
  proxyBackendAdminGet,
  proxyBackendAdminJson,
} from "@/shared/server/backend-admin-proxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
): Promise<Response> {
  const { groupId } = await params;
  return proxyBackendAdminGet({
    request,
    path: `/groups/${groupId}/members`,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
): Promise<Response> {
  const { groupId } = await params;
  try {
    const payload = await request.json();
    return proxyBackendAdminJson({
      request,
      method: "PUT",
      path: `/groups/${groupId}/members`,
      payload,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }
}
