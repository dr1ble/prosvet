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
  const { courseId } = await params;
  return proxyBackendAdminPost({
    request,
    path: `/catalog/courses/${courseId}/validate`,
    payload: {},
  });
}
