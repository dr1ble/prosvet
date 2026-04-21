import { proxyBackendAdminPost } from "@/shared/server/backend-admin-proxy";

type RouteParams = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { taskId } = await params;
  return proxyBackendAdminPost({
    request,
    path: `/catalog/tasks/${taskId}/duplicate`,
    payload: {},
  });
}
