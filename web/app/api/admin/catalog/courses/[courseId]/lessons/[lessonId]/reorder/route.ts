import { proxyBackendAdminPost } from "@/shared/server/backend-admin-proxy";

type RouteParams = {
  params: Promise<{
    courseId: string;
    lessonId: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { courseId, lessonId } = await params;
  const payload = await request.json();
  return proxyBackendAdminPost({
    request,
    path: `/catalog/courses/${courseId}/lessons/${lessonId}/reorder`,
    payload,
  });
}
