import { proxyBackendAdminPost } from "@/shared/server/backend-admin-proxy";

export async function POST(request: Request): Promise<Response> {
  return proxyBackendAdminPost({
    request,
    path: "/auth/qr/onboarding",
    payload: {},
  });
}
