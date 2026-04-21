import { NextResponse } from "next/server";

import {
  proxyBackendAdminGet,
  proxyBackendAdminJson,
} from "@/shared/server/backend-admin-proxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ policyKey: string }> },
): Promise<Response> {
  const { policyKey } = await params;
  return proxyBackendAdminGet({
    request,
    path: `/rbac/policies/${policyKey}`,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ policyKey: string }> },
): Promise<Response> {
  const { policyKey } = await params;
  try {
    const payload = await request.json();
    return proxyBackendAdminJson({
      request,
      method: "PUT",
      path: `/rbac/policies/${policyKey}`,
      payload,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }
}
