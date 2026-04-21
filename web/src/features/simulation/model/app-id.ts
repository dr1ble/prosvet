const DEFAULT_PACKAGE_NAME = "app.custom.app";

const CYRILLIC_TRANSLIT_MAP: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function transliterateCyrillic(value: string): string {
  return Array.from(value)
    .map((char) => {
      const lower = char.toLowerCase();
      if (CYRILLIC_TRANSLIT_MAP[lower] !== undefined) {
        return CYRILLIC_TRANSLIT_MAP[lower];
      }
      return char;
    })
    .join("");
}

function normalizeAscii(value: string): string {
  const transliterated = transliterateCyrillic(value);
  return transliterated
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase();
}

function toPackageSegment(value: string): string {
  return value
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function createPackageNameFromAppName(appName: string): string {
  const normalized = normalizeAscii(appName);
  const tokens = normalized
    .split(/[^a-z0-9_]+/g)
    .map((token) => toPackageSegment(token))
    .filter(Boolean);

  if (tokens.length >= 2) {
    return `${tokens[0]}.${tokens[1]}`;
  }

  if (tokens.length === 1) {
    return `app.${tokens[0]}`;
  }

  return DEFAULT_PACKAGE_NAME;
}

export function isValidPackageName(value: string): boolean {
  return /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)+$/.test(value.trim());
}

export function deriveAppNameFromPackageName(
  packageName: string,
  fallback: string,
): string {
  const segments = packageName
    .trim()
    .split(".")
    .map((part) => part.replace(/[_-]+/g, " ").trim())
    .filter(Boolean);
  if (segments.length === 0) {
    return fallback;
  }
  if (segments.length === 1) {
    return segments[0];
  }
  return `${segments[segments.length - 2]} ${segments[segments.length - 1]}`;
}

export function ensurePackageName(
  packageName: string,
  appName: string,
): string {
  if (isValidPackageName(packageName)) {
    return packageName.trim();
  }
  return createPackageNameFromAppName(appName);
}
