import {
  proxyBackendAdminGet,
  proxyBackendAdminPatch,
} from "@/shared/server/backend-admin-proxy";

export async function GET(request: Request): Promise<Response> {
  return proxyBackendAdminGet({
    request,
    path: "/auth/me",
  });
}

export async function PATCH(request: Request): Promise<Response> {
  const payload = await request.json();
  return proxyBackendAdminPatch({
    request,
    path: "/auth/me",
    payload,
  });
}
