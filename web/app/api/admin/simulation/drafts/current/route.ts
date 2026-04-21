import { NextResponse } from "next/server";

import {
  proxyBackendAdminGet,
  proxyBackendAdminPost,
} from "@/shared/server/backend-admin-proxy";

function buildDraftPath(request: Request): string {
  const url = new URL(request.url);
  const scopeKey = url.searchParams.get("scope_key")?.trim();
  if (!scopeKey) {
    return "/simulation/drafts/current";
  }

  const query = new URLSearchParams({
    scope_key: scopeKey,
  });
  return `/simulation/drafts/current?${query.toString()}`;
}

export async function GET(request: Request): Promise<Response> {
  return proxyBackendAdminGet({
    request,
    path: buildDraftPath(request),
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await request.json();
    return proxyBackendAdminPost({
      request,
      path: buildDraftPath(request),
      payload,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }
}
