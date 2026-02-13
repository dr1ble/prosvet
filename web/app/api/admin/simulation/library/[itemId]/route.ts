import { NextResponse } from "next/server";

import {
  proxyBackendAdminDelete,
  proxyBackendAdminGet,
  proxyBackendAdminPatch,
} from "@/shared/server/backend-admin-proxy";

type RouteParams = {
  params: Promise<{
    itemId: string;
  }>;
};

function buildItemPath(itemId: string): string {
  return `/simulation/library/${encodeURIComponent(itemId)}`;
}

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { itemId } = await params;
  if (!itemId) {
    return NextResponse.json(
      { detail: "itemId is required." },
      { status: 400 },
    );
  }

  return proxyBackendAdminGet({
    request,
    path: buildItemPath(itemId),
  });
}

export async function DELETE(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { itemId } = await params;
  if (!itemId) {
    return NextResponse.json(
      { detail: "itemId is required." },
      { status: 400 },
    );
  }

  return proxyBackendAdminDelete({
    request,
    path: buildItemPath(itemId),
  });
}

export async function PATCH(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { itemId } = await params;
  if (!itemId) {
    return NextResponse.json(
      { detail: "itemId is required." },
      { status: 400 },
    );
  }

  try {
    const payload = await request.json();
    return proxyBackendAdminPatch({
      request,
      path: buildItemPath(itemId),
      payload,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }
}
