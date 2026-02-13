export function getRequestCookie(
  request: Request,
  name: string,
): string | null {
  const rawCookie = request.headers.get("cookie");
  if (!rawCookie) {
    return null;
  }

  const segments = rawCookie.split(";");
  // Prefer the last occurrence to avoid stale duplicate cookies in some browsers.
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    const [key, ...rawValue] = segment.trim().split("=");
    if (key !== name || rawValue.length === 0) {
      continue;
    }
    const value = rawValue.join("=");
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}
