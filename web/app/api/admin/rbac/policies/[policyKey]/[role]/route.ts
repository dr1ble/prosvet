import { NextResponse } from "next/server";

import {
  proxyBackendAdminGet,
  proxyBackendAdminJson,
} from "@/shared/server/backend-admin-proxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ policyKey: string; role: string }> },
): Promise<Response> {
  const { policyKey, role } = await params;
  return proxyBackendAdminGet({
    request,
    path: `/rbac/policies/${policyKey}/${role}`,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ policyKey: string; role: string }> },
): Promise<Response> {
  const { policyKey, role } = await params;
  try {
    const payload = await request.json();
    return proxyBackendAdminJson({
      request,
      method: "PATCH",
      path: `/rbac/policies/${policyKey}/${role}`,
      payload,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ policyKey: string; role: string }> },
): Promise<Response> {
  const { policyKey, role } = await params;
  return proxyBackendAdminJson({
    request,
    method: "DELETE",
    path: `/rbac/policies/${policyKey}/${role}`,
    payload: null,
  });
}
