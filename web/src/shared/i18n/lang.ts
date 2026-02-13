export const SUPPORTED_LANGUAGES = ["ru", "en"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = "ru";

export function resolveLanguage(value: string | null | undefined): AppLanguage {
  if (value === "en") {
    return "en";
  }
  return "ru";
}

export function formatLocale(language: AppLanguage): string {
  return language === "ru" ? "ru-RU" : "en-US";
}
