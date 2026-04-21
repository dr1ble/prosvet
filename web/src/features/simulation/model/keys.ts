export function toReleaseScreenKey(
  value: string,
  fallbackIndex: number,
): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "");

  if (normalized.length >= 3) {
    return normalized.slice(0, 120);
  }

  return `screen-${fallbackIndex + 1}`;
}
