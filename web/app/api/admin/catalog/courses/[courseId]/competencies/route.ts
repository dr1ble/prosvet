import { NextResponse } from "next/server";

import {
  proxyBackendAdminGet,
  proxyBackendAdminJson,
} from "@/shared/server/backend-admin-proxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
): Promise<Response> {
  const { courseId } = await params;
  return proxyBackendAdminGet({
    request,
    path: `/catalog/courses/${courseId}/competencies`,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
): Promise<Response> {
  const { courseId } = await params;
  try {
    const payload = await request.json();
    return proxyBackendAdminJson({
      request,
      method: "PUT",
      path: `/catalog/courses/${courseId}/competencies`,
      payload,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }
}
