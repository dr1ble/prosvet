function cleanErrorText(value: string): string {
  return value
    .trim()
    .replace(/^["«»]+|["«»]+$/g, "")
    .trim();
}

function coerceErrorMessage(value: unknown): string | null {
  if (typeof value === "string") {
    const cleaned = cleanErrorText(value);
    return cleaned || null;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => coerceErrorMessage(item))
      .filter((item): item is string => Boolean(item));
    if (parts.length > 0) {
      return parts.join("; ");
    }
    return null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nested =
      coerceErrorMessage(record.message) ??
      coerceErrorMessage(record.detail) ??
      coerceErrorMessage(record.reason) ??
      coerceErrorMessage(record.msg);
    if (nested) {
      return nested;
    }
  }

  return null;
}

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
    const payload = JSON.parse(text) as unknown;

    const resolved =
      coerceErrorMessage(payload) ||
      (payload && typeof payload === "object"
        ? coerceErrorMessage((payload as { detail?: unknown }).detail) ||
          coerceErrorMessage((payload as { message?: unknown }).message)
        : null);

    if (resolved) {
      return resolved;
    }
  } catch {
    // ignore invalid JSON and fall through to raw text handling
  }

  if (/^<!doctype html/i.test(text) || /^<html/i.test(text)) {
    return fallback;
  }

  if (text.startsWith("{") || text.startsWith("[")) {
    return fallback;
  }

  if (text.startsWith("Request failed")) {
    return fallback;
  }

  if (status >= 500) {
    return fallback;
  }

  return cleanErrorText(text);
}

export function toUserErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message.trim() || fallback;
  }
  return fallback;
}
