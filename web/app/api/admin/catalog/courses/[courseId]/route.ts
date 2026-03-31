import { proxyBackendAdminPatch } from "@/shared/server/backend-admin-proxy";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
): Promise<Response> {
  const { courseId } = await params;
  return proxyBackendAdminPatch({
    request: _request,
    path: `/catalog/courses/${courseId}`,
    payload: await _request.json(),
  });
}
