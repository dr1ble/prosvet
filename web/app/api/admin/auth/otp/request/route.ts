import { NextResponse } from "next/server";

import { postBackendAuthJson } from "@/shared/server/backend-auth-proxy";

type OtpRequestPayload = {
  phone?: unknown;
};

export async function POST(request: Request): Promise<Response> {
  let payload: OtpRequestPayload;
  try {
    payload = (await request.json()) as OtpRequestPayload;
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  if (typeof payload.phone !== "string" || payload.phone.trim().length < 6) {
    return NextResponse.json({ detail: "phone is required." }, { status: 422 });
  }

  const backendResult = await postBackendAuthJson({
    path: "/auth/otp/request",
    payload: {
      phone: payload.phone,
    },
  });
  return NextResponse.json(backendResult.body, {
    status: backendResult.status,
  });
}
