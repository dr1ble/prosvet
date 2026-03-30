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

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { courseId } = await params;
  const url = new URL(request.url);
  const includeArchived = url.searchParams.get("include_archived") === "true";

  return proxyBackendAdminGet({
    request,
    path: `/catalog/courses/${courseId}/lessons?include_archived=${includeArchived}`,
  });
}

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const { courseId } = await params;
    const payload = await request.json();
    return proxyBackendAdminPost({
      request,
      path: `/catalog/courses/${courseId}/lessons`,
      payload,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }
}
