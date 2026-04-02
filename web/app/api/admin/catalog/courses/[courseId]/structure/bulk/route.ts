import { proxyBackendAdminJson } from "@/shared/server/backend-admin-proxy";

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
  const payload = await request.json();

  return proxyBackendAdminJson({
    request,
    method: "POST",
    path: `/catalog/courses/${courseId}/structure/bulk`,
    payload,
  });
}
