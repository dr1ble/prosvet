import {
  proxyBackendAdminGet,
  proxyBackendAdminPost,
} from "@/shared/server/backend-admin-proxy";

type RouteParams = {
  params: Promise<{
    lessonId: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { lessonId } = await params;
  return proxyBackendAdminGet({
    request,
    path: `/catalog/lessons/${lessonId}/tasks`,
  });
}

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { lessonId } = await params;
  const payload = await request.json();
  return proxyBackendAdminPost({
    request,
    path: `/catalog/lessons/${lessonId}/tasks`,
    payload,
  });
}
