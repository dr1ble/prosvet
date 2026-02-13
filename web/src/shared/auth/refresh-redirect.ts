import type { AppLanguage } from "@/shared/i18n/lang";

function normalizeNextPath(nextPath: string): string {
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/";
  }
  return nextPath;
}

export function buildRefreshRedirectHref(
  nextPath: string,
  language: AppLanguage,
): string {
  const searchParams = new URLSearchParams({
    next: normalizeNextPath(nextPath),
    lang: language,
  });
  return `/api/admin/auth/refresh?${searchParams.toString()}`;
}
