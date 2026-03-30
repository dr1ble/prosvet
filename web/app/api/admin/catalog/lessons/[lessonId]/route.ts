import {
  proxyBackendAdminDelete,
  proxyBackendAdminPatch,
} from "@/shared/server/backend-admin-proxy";

type RouteParams = {
  params: Promise<{
    lessonId: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { lessonId } = await params;
  const payload = await request.json();
  return proxyBackendAdminPatch({
    request,
    path: `/catalog/lessons/${lessonId}`,
    payload,
  });
}

export async function DELETE(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { lessonId } = await params;
  return proxyBackendAdminDelete({
    request,
    path: `/catalog/lessons/${lessonId}`,
  });
}
