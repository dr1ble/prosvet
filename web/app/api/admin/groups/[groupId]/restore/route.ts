import { proxyBackendAdminPost } from "@/shared/server/backend-admin-proxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
): Promise<Response> {
  const { groupId } = await params;
  return proxyBackendAdminPost({
    request,
    path: `/groups/${groupId}/restore`,
    payload: {},
  });
}
