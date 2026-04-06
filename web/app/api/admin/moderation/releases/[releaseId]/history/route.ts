import { proxyBackendAdminGet } from "@/shared/server/backend-admin-proxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ releaseId: string }> },
): Promise<Response> {
  const { releaseId } = await params;
  return proxyBackendAdminGet({
    request,
    path: `/moderation/releases/${releaseId}/history`,
  });
}
