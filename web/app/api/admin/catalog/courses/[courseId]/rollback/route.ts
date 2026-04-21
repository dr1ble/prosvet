import { proxyBackendAdminPost } from "@/shared/server/backend-admin-proxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
): Promise<Response> {
  const { courseId } = await params;
  return proxyBackendAdminPost({
    request,
    path: `/catalog/courses/${courseId}/rollback`,
    payload: await request.json(),
  });
}
