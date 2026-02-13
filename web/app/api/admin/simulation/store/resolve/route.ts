import { NextResponse } from "next/server";

type StoreType = "play_market" | "rustore" | "app_store";

type ResolvePayload = {
  store_url?: unknown;
};

const PACKAGE_PATTERN = /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)+$/;
const ATTR_REGEX =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
const JSON_LD_REGEX =
  /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const STORE_HOSTS: Record<StoreType, string[]> = {
  play_market: ["play.google.com"],
  rustore: ["rustore.ru", "www.rustore.ru"],
  app_store: ["apps.apple.com", "itunes.apple.com"],
};

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

function parseAttributes(tag: string): Map<string, string> {
  const result = new Map<string, string>();
  ATTR_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTR_REGEX.exec(tag)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    result.set(key, decodeHtml(value));
  }
  return result;
}

function collectTags(html: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  const matches = html.match(regex);
  return matches ?? [];
}

function findMetaContent(html: string, name: string): string | null {
  const lowered = name.toLowerCase();
  const tags = collectTags(html, "meta");
  for (const tag of tags) {
    const attrs = parseAttributes(tag);
    const property = attrs.get("property")?.toLowerCase();
    const metaName = attrs.get("name")?.toLowerCase();
    if (property !== lowered && metaName !== lowered) {
      continue;
    }
    const content = attrs.get("content");
    if (content?.trim()) {
      return stripTags(content.trim());
    }
  }
  return null;
}

function findLinkHref(html: string, relName: string): string | null {
  const lowered = relName.toLowerCase();
  const tags = collectTags(html, "link");
  for (const tag of tags) {
    const attrs = parseAttributes(tag);
    const rel = attrs.get("rel")?.toLowerCase();
    if (!rel) {
      continue;
    }
    const relParts = rel.split(/\s+/);
    if (!relParts.includes(lowered)) {
      continue;
    }
    const href = attrs.get("href");
    if (href?.trim()) {
      return href.trim();
    }
  }
  return null;
}

function findTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) {
    return null;
  }
  const normalized = decodeHtml(stripTags(match[1]));
  return normalized || null;
}

function findTagTextCandidates(html: string, tagName: string): string[] {
  const regex = new RegExp(
    `<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    "gi",
  );
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const raw = match[1] ?? "";
    const normalized = normalizeText(decodeHtml(stripTags(raw)));
    if (normalized) {
      results.push(normalized);
    }
  }
  return results;
}

function normalizeText(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitTitleSegments(value: string): string[] {
  return normalizeText(value)
    .split(/\s+[|–—-]\s+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isStoreMarkerSegment(value: string, storeType: StoreType): boolean {
  const normalized = normalizeText(value);
  if (!normalized) {
    return true;
  }
  if (storeType === "play_market") {
    return /google\s*play|apps?\s+on\s+google\s+play|приложения?\s+в\s+google\s+play/i.test(
      normalized,
    );
  }
  if (storeType === "rustore") {
    return /rustore|в\s+каталоге\s+rustore|в\s+rustore/i.test(normalized);
  }
  return /app\s*store|apple/i.test(normalized);
}

function pickNonStoreSegment(value: string, storeType: StoreType): string {
  const segments = splitTitleSegments(value);
  if (segments.length <= 1) {
    return value;
  }
  const candidates = segments.filter(
    (segment) => !isStoreMarkerSegment(segment, storeType),
  );
  if (candidates.length === 0) {
    return segments[0];
  }
  return candidates.sort((a, b) => b.length - a.length)[0];
}

function cleanStoreTitle(value: string, storeType: StoreType): string {
  const raw = normalizeText(value);
  if (!raw) {
    return "";
  }

  let cleaned = raw;
  if (storeType === "play_market") {
    cleaned = cleaned
      .replace(/^apps?\s+on\s+google\s+play\s*[–—|:-]\s*/i, "")
      .replace(/^приложения?\s+в\s+google\s+play\s*[–—|:-]\s*/i, "")
      .replace(/^google\s*play(?:\s*store)?\s*[–—|:-]\s*/i, "")
      .replace(/\s*[–—|:-]\s*apps?\s+on\s+google\s+play$/i, "")
      .replace(/\s*[–—|:-]\s*google\s*play(?:\s*store)?$/i, "")
      .replace(/\s*[–—|:-]\s*приложения?\s+в\s+google\s+play$/i, "");
  } else if (storeType === "rustore") {
    cleaned = cleaned
      .replace(/\s+в\s+каталоге\s+rustore$/i, "")
      .replace(/\s+в\s+rustore$/i, "")
      .replace(/\s*[–—|:-]\s*rustore$/i, "")
      .replace(/\s*\|\s*rustore$/i, "");
  } else {
    cleaned = cleaned
      .replace(/\s+on\s+the\s+app\s+store$/i, "")
      .replace(/\s+in\s+the\s+app\s+store$/i, "")
      .replace(/\s+в\s+app\s+store$/i, "")
      .replace(/\s*[–—|:-]\s*app\s+store$/i, "")
      .replace(/\s*[–—|:-]\s*apple$/i, "");
  }

  cleaned = pickNonStoreSegment(cleaned, storeType);
  return normalizeText(cleaned);
}

function parseJson(value: string): unknown | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function readJsonLdCandidates(value: unknown, bucket: string[]): void {
  if (!value) {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      readJsonLdCandidates(item, bucket);
    }
    return;
  }
  if (typeof value !== "object") {
    return;
  }

  const node = value as Record<string, unknown>;
  const typeValue = node["@type"];
  const nameValue = node.name;
  const normalizedTypes = Array.isArray(typeValue)
    ? typeValue.map((item) => String(item).toLowerCase())
    : [String(typeValue ?? "").toLowerCase()];
  const isAppLike = normalizedTypes.some((item) =>
    /(softwareapplication|mobileapplication|application|product)/i.test(item),
  );
  if (isAppLike && typeof nameValue === "string" && nameValue.trim()) {
    bucket.push(nameValue.trim());
  }

  for (const child of Object.values(node)) {
    if (typeof child === "object" && child) {
      readJsonLdCandidates(child, bucket);
    }
  }
}

function findJsonLdAppNames(html: string): string[] {
  const names: string[] = [];
  JSON_LD_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = JSON_LD_REGEX.exec(html)) !== null) {
    const raw = (match[1] ?? "").trim();
    if (!raw) {
      continue;
    }
    const parsed = parseJson(raw);
    if (!parsed) {
      continue;
    }
    readJsonLdCandidates(parsed, names);
  }
  return names.map(normalizeText).filter(Boolean);
}

function findStoreHeadingCandidates(
  html: string,
  storeType: StoreType,
): string[] {
  const candidates = [
    ...findTagTextCandidates(html, "h1"),
    ...findTagTextCandidates(html, "h2"),
  ];

  if (storeType !== "app_store") {
    return candidates;
  }

  // App Store often renders heading lines like: "Telegram Messenger\nApp".
  return candidates.flatMap((value) =>
    value
      .split(/\n+/g)
      .map((part) => normalizeText(part))
      .filter(Boolean),
  );
}

function fallbackAppNameFromUrl(url: URL, storeType: StoreType): string | null {
  if (storeType === "play_market") {
    const packageId = url.searchParams.get("id")?.trim();
    if (packageId) {
      return packageId.split(".").pop() ?? packageId;
    }
    return null;
  }

  if (storeType === "rustore") {
    const segments = url.pathname
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .filter(Boolean);
    const appIndex = segments.findIndex((segment) => segment === "app");
    if (appIndex >= 0 && segments[appIndex + 1]) {
      return segments[appIndex + 1];
    }
    return null;
  }

  const segments = url.pathname
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .filter(Boolean);
  const appIndex = segments.findIndex((segment) => segment === "app");
  if (appIndex >= 0 && segments[appIndex + 1]) {
    return segments[appIndex + 1];
  }
  return null;
}

function pickBestAppName(html: string, storeType: StoreType): string | null {
  const candidates: string[] = [];
  candidates.push(...findStoreHeadingCandidates(html, storeType));
  candidates.push(...findJsonLdAppNames(html));
  const metaCandidates = [
    findMetaContent(html, "al:android:app_name"),
    findMetaContent(html, "al:ios:app_name"),
    findMetaContent(html, "og:title"),
    findMetaContent(html, "twitter:title"),
    findMetaContent(html, "application-name"),
    findTitle(html),
  ];
  for (const item of metaCandidates) {
    if (!item) {
      continue;
    }
    candidates.push(item);
  }

  for (const candidate of candidates) {
    const cleaned = cleanStoreTitle(candidate, storeType);
    if (!cleaned) {
      continue;
    }
    if (hasChallengeMarker(cleaned)) {
      continue;
    }
    if (isStoreMarkerSegment(cleaned, storeType)) {
      continue;
    }
    return cleaned;
  }

  for (const candidate of candidates) {
    const cleaned = cleanStoreTitle(candidate, storeType);
    if (cleaned) {
      return cleaned;
    }
  }

  return null;
}

function detectStoreType(url: URL): StoreType | null {
  const host = url.hostname.toLowerCase();
  if (
    STORE_HOSTS.play_market.some(
      (item) => host === item || host.endsWith(`.${item}`),
    )
  ) {
    return "play_market";
  }
  if (
    STORE_HOSTS.rustore.some(
      (item) => host === item || host.endsWith(`.${item}`),
    )
  ) {
    return "rustore";
  }
  if (
    STORE_HOSTS.app_store.some(
      (item) => host === item || host.endsWith(`.${item}`),
    )
  ) {
    return "app_store";
  }
  return null;
}

function toAbsoluteUrl(candidate: string | null, base: URL): string | null {
  if (!candidate) {
    return null;
  }
  try {
    return new URL(candidate, base).toString();
  } catch {
    return null;
  }
}

function normalizeAscii(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase();
}

function fallbackPackageFromName(appName: string): string {
  const normalized = normalizeAscii(appName);
  const parts = normalized
    .split(/[^a-z0-9_]+/g)
    .map((part) => part.replace(/[^a-z0-9_]/g, ""))
    .filter(Boolean)
    .slice(0, 3);
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[1]}`;
  }
  if (parts.length === 1) {
    return `app.${parts[0]}`;
  }
  return "app.custom.app";
}

function ensurePackageName(candidate: string | null, appName: string): string {
  const normalized = (candidate ?? "").trim();
  if (PACKAGE_PATTERN.test(normalized)) {
    return normalized;
  }
  const fallback = fallbackPackageFromName(appName);
  if (PACKAGE_PATTERN.test(fallback)) {
    return fallback;
  }
  return "app.custom.app";
}

function extractPackageNameFromUrl(
  url: URL,
  storeType: StoreType,
): string | null {
  if (storeType === "play_market") {
    return url.searchParams.get("id");
  }

  if (storeType === "rustore") {
    const segments = url.pathname.split("/").filter(Boolean);
    const appIndex = segments.findIndex((segment) => segment === "app");
    if (appIndex >= 0 && segments[appIndex + 1]) {
      return decodeURIComponent(segments[appIndex + 1]);
    }
    return null;
  }

  const pathMatch = url.pathname.match(/\/id(\d+)/i);
  const queryId = url.searchParams.get("id");
  const appId = pathMatch?.[1] ?? queryId?.trim() ?? "";
  if (!appId) {
    return null;
  }
  return `appstore.id${appId}`;
}

function buildResponse(
  html: string,
  finalUrl: URL,
  storeType: StoreType,
  initialUrl: URL,
): {
  store_type: StoreType;
  app_name: string;
  package_name: string;
  icon_url: string | null;
  canonical_url: string;
} {
  const fallbackAppName =
    fallbackAppNameFromUrl(finalUrl, storeType) ??
    fallbackAppNameFromUrl(initialUrl, storeType) ??
    initialUrl.hostname;
  const resolvedName = pickBestAppName(html, storeType);
  const appName = resolvedName ?? "";

  const packageFromUrl =
    extractPackageNameFromUrl(finalUrl, storeType) ??
    extractPackageNameFromUrl(initialUrl, storeType);
  const packageName = ensurePackageName(
    packageFromUrl,
    appName || fallbackAppName,
  );

  const iconCandidate =
    findMetaContent(html, "og:image") ??
    findMetaContent(html, "twitter:image") ??
    findLinkHref(html, "apple-touch-icon") ??
    findLinkHref(html, "icon");
  const iconUrl =
    toAbsoluteUrl(iconCandidate, finalUrl) ??
    toAbsoluteUrl(iconCandidate, initialUrl);

  return {
    store_type: storeType,
    app_name: appName,
    package_name: packageName,
    icon_url: iconUrl,
    canonical_url: finalUrl.toString(),
  };
}

function hasChallengeMarker(value: string): boolean {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    /challenge|captcha|cloudflare|ddos|access denied|too many requests|security check/.test(
      normalized,
    ) ||
    /(?:^|[\s:;,.()\[\]{}_-])error\s*4\d\d(?:$|[\s:;,.()\[\]{}_-])/i.test(
      normalized,
    ) ||
    normalized.includes("ошибка 429") ||
    /ошибка\s*4\d\d/i.test(normalized)
  );
}

function isStoreChallengeResponse(
  html: string,
  finalUrl: URL,
  storeType: StoreType,
  appName: string,
): boolean {
  const finalPath = finalUrl.pathname.toLowerCase();
  if (finalPath.includes("challenge")) {
    return true;
  }

  const title = findTitle(html) ?? "";
  const ogTitle = findMetaContent(html, "og:title") ?? "";
  const bodyStart = html.slice(0, 3000);

  if (storeType === "rustore" && hasChallengeMarker(finalUrl.toString())) {
    return true;
  }

  if (
    hasChallengeMarker(title) ||
    hasChallengeMarker(ogTitle) ||
    hasChallengeMarker(appName) ||
    hasChallengeMarker(bodyStart)
  ) {
    return true;
  }

  return false;
}

function buildFetchCandidates(url: URL, storeType: StoreType): string[] {
  const candidates: string[] = [url.toString()];
  if (storeType !== "play_market") {
    return candidates;
  }

  const enriched = new URL(url.toString());
  if (!enriched.searchParams.get("hl")) {
    enriched.searchParams.set("hl", "en");
  }
  if (!enriched.searchParams.get("gl")) {
    enriched.searchParams.set("gl", "US");
  }
  const enrichedValue = enriched.toString();
  if (!candidates.includes(enrichedValue)) {
    candidates.push(enrichedValue);
  }

  const packageId = url.searchParams.get("id")?.trim();
  if (packageId) {
    const canonical = new URL("https://play.google.com/store/apps/details");
    canonical.searchParams.set("id", packageId);
    canonical.searchParams.set("hl", "en");
    canonical.searchParams.set("gl", "US");
    const canonicalValue = canonical.toString();
    if (!candidates.includes(canonicalValue)) {
      candidates.push(canonicalValue);
    }
  }

  return candidates;
}

async function fetchStorePage(
  url: URL,
  storeType: StoreType,
): Promise<Response> {
  let lastResponse: Response | null = null;
  let lastError: Error | null = null;
  const candidates = buildFetchCandidates(url, storeType);

  for (const candidate of candidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      try {
        const response = await fetch(candidate, {
          method: "GET",
          headers: {
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
            accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "accept-language": "ru,en;q=0.9",
          },
          cache: "no-store",
          redirect: "follow",
          signal: controller.signal,
        });
        if (response.ok) {
          return response;
        }
        lastResponse = response;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      if (error instanceof Error) {
        lastError = error;
      }
    }
  }

  if (lastResponse) {
    return lastResponse;
  }
  throw lastError ?? new Error("Failed to load store page.");
}

type RustoreOverallInfoResponse = {
  code?: unknown;
  message?: unknown;
  body?: {
    appName?: unknown;
    packageName?: unknown;
    iconUrl?: unknown;
  };
};

async function fetchRustoreOverallInfo(packageName: string): Promise<{
  appName: string;
  packageName: string;
  iconUrl: string | null;
} | null> {
  const safePackageName = packageName.trim();
  if (!safePackageName) {
    return null;
  }

  const endpoint = `https://backapi.rustore.ru/applicationData/overallInfo/${encodeURIComponent(
    safePackageName,
  )}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as RustoreOverallInfoResponse;
    const code = String(payload.code ?? "").toUpperCase();
    if (code && code !== "OK") {
      return null;
    }

    const appNameRaw =
      typeof payload.body?.appName === "string" ? payload.body.appName : "";
    const packageRaw =
      typeof payload.body?.packageName === "string"
        ? payload.body.packageName
        : safePackageName;
    const iconRaw =
      typeof payload.body?.iconUrl === "string" ? payload.body.iconUrl : "";

    const appName = normalizeText(appNameRaw);
    if (!appName) {
      return null;
    }

    const normalizedPackage = ensurePackageName(packageRaw, appName || "app");
    const iconUrl = toAbsoluteUrl(iconRaw, new URL(endpoint));

    return {
      appName,
      packageName: normalizedPackage,
      iconUrl,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request): Promise<Response> {
  let payload: ResolvePayload;
  try {
    payload = (await request.json()) as ResolvePayload;
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const rawStoreUrl =
    typeof payload.store_url === "string" ? payload.store_url.trim() : "";
  if (!rawStoreUrl) {
    return NextResponse.json(
      { detail: "store_url is required." },
      { status: 422 },
    );
  }

  let url: URL;
  try {
    url = new URL(rawStoreUrl);
  } catch {
    return NextResponse.json({ detail: "Invalid store URL." }, { status: 422 });
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return NextResponse.json(
      { detail: "Store URL must use http or https." },
      { status: 422 },
    );
  }

  const storeType = detectStoreType(url);
  if (!storeType) {
    return NextResponse.json(
      {
        detail:
          "Unsupported store host. Use Google Play, RuStore, or App Store URL.",
      },
      { status: 422 },
    );
  }

  if (
    url.pathname.toLowerCase().includes("challenge") ||
    hasChallengeMarker(url.toString())
  ) {
    return NextResponse.json(
      {
        detail:
          "The provided URL points to a challenge/429 page. Open the app page in the store and copy that URL.",
      },
      { status: 422 },
    );
  }

  if (storeType === "rustore") {
    const packageFromUrl = extractPackageNameFromUrl(url, "rustore");
    if (packageFromUrl) {
      const rustoreData = await fetchRustoreOverallInfo(packageFromUrl);
      if (rustoreData) {
        return NextResponse.json({
          store_type: "rustore",
          app_name: rustoreData.appName,
          package_name: rustoreData.packageName,
          icon_url: rustoreData.iconUrl,
          canonical_url: `https://www.rustore.ru/catalog/app/${encodeURIComponent(
            rustoreData.packageName,
          )}`,
        });
      }
    }
  }

  let response: Response;
  try {
    response = await fetchStorePage(url, storeType);
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Failed to load store page.";
    return NextResponse.json({ detail }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json(
      { detail: `Store request failed (${response.status}).` },
      { status: 502 },
    );
  }

  let html = "";
  try {
    html = await response.text();
  } catch {
    return NextResponse.json(
      { detail: "Unable to read store page content." },
      { status: 502 },
    );
  }

  const finalUrl = (() => {
    try {
      return new URL(response.url);
    } catch {
      return url;
    }
  })();

  const data = buildResponse(html, finalUrl, storeType, url);
  if (!data.app_name.trim()) {
    return NextResponse.json(
      {
        detail:
          "Не удалось определить название приложения по странице магазина. Попробуйте другую ссылку.",
      },
      { status: 502 },
    );
  }
  if (isStoreChallengeResponse(html, finalUrl, storeType, data.app_name)) {
    return NextResponse.json(
      {
        detail:
          "Store temporarily returned an anti-bot or rate-limit page (challenge/429). Try again later or use a direct app page URL.",
      },
      { status: 502 },
    );
  }
  return NextResponse.json(data);
}
