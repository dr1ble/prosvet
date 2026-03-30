import {
  proxyBackendAdminDelete,
  proxyBackendAdminPatch,
} from "@/shared/server/backend-admin-proxy";

type RouteParams = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { taskId } = await params;
  const payload = await request.json();
  return proxyBackendAdminPatch({
    request,
    path: `/catalog/tasks/${taskId}`,
    payload,
  });
}

export async function DELETE(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { taskId } = await params;
  return proxyBackendAdminDelete({
    request,
    path: `/catalog/tasks/${taskId}`,
  });
}
