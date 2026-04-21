import { proxyBackendAdminPost } from "@/shared/server/backend-admin-proxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ releaseId: string }> },
): Promise<Response> {
  const { releaseId } = await params;
  return proxyBackendAdminPost({
    request,
    path: `/moderation/releases/${releaseId}/submit`,
    payload: await request.json(),
  });
}
