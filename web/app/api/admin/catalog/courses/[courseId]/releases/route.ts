import { NextResponse } from "next/server";

import {
  proxyBackendAdminGet,
  proxyBackendAdminPost,
} from "@/shared/server/backend-admin-proxy";

type RouteParams = {
  params: Promise<{
    courseId: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const { courseId } = await params;
    const payload = await request.json();
    return proxyBackendAdminPost({
      request,
      path: `/catalog/courses/${courseId}/releases`,
      payload,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { courseId } = await params;
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const suffix = query ? `?${query}` : "";

  return proxyBackendAdminGet({
    request,
    path: `/catalog/courses/${courseId}/releases${suffix}`,
  });
}
