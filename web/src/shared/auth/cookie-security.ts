function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  );
}

export function resolveSecureCookieFlag(request: Request): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  let url: URL | null = null;
  try {
    url = new URL(request.url);
  } catch {
    url = null;
  }

  const hostname = url?.hostname ?? "";
  if (hostname && isLocalHostname(hostname)) {
    return false;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    const firstProto = forwardedProto.split(",")[0]?.trim().toLowerCase();
    if (firstProto === "https") {
      return true;
    }
    if (firstProto === "http") {
      return false;
    }
  }

  if (url) {
    return url.protocol === "https:";
  }

  return true;
}
