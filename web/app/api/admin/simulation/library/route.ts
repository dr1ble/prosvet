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
  const appPackageName = url.searchParams.get("app_package_name")?.trim() ?? "";
  const storeType = url.searchParams.get("store_type")?.trim() ?? "";
  const minSupportedVersion =
    url.searchParams.get("min_supported_version")?.trim() ?? "";
  const maxSupportedVersion =
    url.searchParams.get("max_supported_version")?.trim() ?? "";
  const releasedAt = url.searchParams.get("released_at")?.trim() ?? "";

  const query = new URLSearchParams({
    scope_key: scopeKey.slice(0, 190),
    search_query: searchQuery,
    limit,
  });
  if (appPackageName) {
    query.set("app_package_name", appPackageName.slice(0, 255));
  }
  if (storeType) {
    query.set("store_type", storeType.slice(0, 30));
  }
  if (minSupportedVersion) {
    query.set("min_supported_version", minSupportedVersion.slice(0, 40));
  }
  if (maxSupportedVersion) {
    query.set("max_supported_version", maxSupportedVersion.slice(0, 40));
  }
  if (releasedAt) {
    query.set("released_at", releasedAt.slice(0, 20));
  }

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
