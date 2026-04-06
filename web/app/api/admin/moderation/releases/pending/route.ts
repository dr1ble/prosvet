import { proxyBackendAdminGet } from "@/shared/server/backend-admin-proxy";

export async function GET(request: Request): Promise<Response> {
  return proxyBackendAdminGet({
    request,
    path: "/moderation/releases/pending",
  });
}
