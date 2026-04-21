import { apiBaseUrl } from "@/shared/config";

type AuthProxyPayload = {
  path: string;
  payload: unknown;
};

export async function postBackendAuthJson({
  path,
  payload,
}: AuthProxyPayload): Promise<{ status: number; body: unknown }> {
  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to connect to backend auth API.";
    return {
      status: 502,
      body: { detail: message },
    };
  }

  const raw = await backendResponse.text();
  if (!raw) {
    return { status: backendResponse.status, body: {} };
  }

  try {
    return { status: backendResponse.status, body: JSON.parse(raw) };
  } catch {
    return {
      status: backendResponse.status,
      body: { detail: raw },
    };
  }
}
