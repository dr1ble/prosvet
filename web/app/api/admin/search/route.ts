import { NextRequest, NextResponse } from "next/server";
import { proxyBackendAdminGet } from "@/shared/server/backend-admin-proxy";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const types = searchParams.getAll("types");
    const limit = searchParams.get("limit") || "20";

    const backendPath = `/search?q=${encodeURIComponent(q)}&limit=${limit}${types.map((t) => `&types=${t}`).join("")}`;

    const response = await proxyBackendAdminGet({
      request,
      path: backendPath,
    });
    return NextResponse.json(response);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch search results" },
      { status: 500 },
    );
  }
}
