import { proxyBackendAdminGet } from "@/shared/server/backend-admin-proxy";

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
  return proxyBackendAdminGet({
    request,
    path: `/catalog/courses/${courseId}/structure`,
  });
}
