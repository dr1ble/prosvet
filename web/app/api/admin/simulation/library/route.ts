import { NextResponse } from "next/server";

import {
  proxyBackendAdminGet,
  proxyBackendAdminPost,
} from "@/shared/server/backend-admin-proxy";

function buildLibraryPath(request: Request): string {
  const url = new URL(request.url);
  const scopeKey = url.searchParams.get("scope_key")?.trim() || "global";
  const searchQuery = url.searchParams.get("search_query")?.trim() ?? "";
  const limit = url.searchParams.get("limit")?.trim() || "40";

  const query = new URLSearchParams({
    scope_key: scopeKey.slice(0, 190),
    search_query: searchQuery,
    limit,
  });

  return `/simulation/library?${query.toString()}`;
}

export async function GET(request: Request): Promise<Response> {
  return proxyBackendAdminGet({
    request,
    path: buildLibraryPath(request),
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await request.json();
    return proxyBackendAdminPost({
      request,
      path: buildLibraryPath(request),
      payload,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }
}
