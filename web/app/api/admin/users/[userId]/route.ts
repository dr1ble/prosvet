import { proxyBackendAdminPatch } from "@/shared/server/backend-admin-proxy";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { userId } = await context.params;
  const payload = await request.json();
  return proxyBackendAdminPatch({
    request,
    path: `/users/${userId}`,
    payload,
  });
}
