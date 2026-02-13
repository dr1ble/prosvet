import { NextResponse } from "next/server";

import { proxyBackendAdminPost } from "@/shared/server/backend-admin-proxy";

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
