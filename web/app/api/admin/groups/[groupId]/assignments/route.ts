import { NextResponse } from "next/server";

import {
  proxyBackendAdminGet,
  proxyBackendAdminPost,
} from "@/shared/server/backend-admin-proxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
): Promise<Response> {
  const { groupId } = await params;
  return proxyBackendAdminGet({
    request,
    path: `/groups/${groupId}/assignments`,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
): Promise<Response> {
  const { groupId } = await params;
  try {
    const payload = await request.json();
    return proxyBackendAdminPost({
      request,
      path: `/groups/${groupId}/assignments`,
      payload,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }
}
