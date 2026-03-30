import { proxyBackendAdminPost } from "@/shared/server/backend-admin-proxy";

type RouteParams = {
  params: Promise<{
    lessonId: string;
    taskId: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { lessonId, taskId } = await params;
  const payload = await request.json();
  return proxyBackendAdminPost({
    request,
    path: `/catalog/lessons/${lessonId}/tasks/${taskId}/reorder`,
    payload,
  });
}
