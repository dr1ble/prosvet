export function extractApiErrorMessage(
  raw: string,
  status: number,
  fallback: string,
): string {
  const text = raw.trim();
  if (!text) {
    return fallback;
  }

  try {
    const payload = JSON.parse(text) as { detail?: unknown; message?: unknown };
    const detail = typeof payload.detail === "string" ? payload.detail : null;
    const message =
      typeof payload.message === "string" ? payload.message : null;
    const resolved = detail || message;
    if (resolved) {
      return resolved.replace(/[»"]+$/g, "").trim();
    }
  } catch {
    // ignore invalid JSON and fall through to raw text handling
  }

  if (text.startsWith("Request failed")) {
    return fallback;
  }

  if (status >= 500) {
    return fallback;
  }

  return text.replace(/[»"]+$/g, "").trim();
}

export function toUserErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message.trim() || fallback;
  }
  return fallback;
}
