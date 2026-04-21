import { proxyBackendAdminPost } from "@/shared/server/backend-admin-proxy";

type RouteParams = {
  params: Promise<{
    lessonId: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { lessonId } = await params;
  return proxyBackendAdminPost({
    request,
    path: `/catalog/lessons/${lessonId}/restore`,
    payload: {},
  });
}
