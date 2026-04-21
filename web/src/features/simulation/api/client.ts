import type { SimulationDraft, SimulationStoreType } from "../model/types";
import { normalizeSimulationDraft } from "../model/validation";
import { extractApiErrorMessage } from "@/shared/lib/api-error";

type DraftApiOut = {
  id: string;
  owner_user_id: string;
  scope_key: string;
  title: string;
  payload_json: unknown;
  created_at: string;
  updated_at: string;
};

type MediaAssetApiOut = {
  id: string;
  owner_user_id: string;
  scope_key: string;
  original_filename: string;
  app_package_name: string;
  store_type: SimulationStoreType;
  min_supported_version: string;
  max_supported_version: string;
  released_at: string | null;
  content_type: string;
  size_bytes: number;
  created_at: string;
};

type MediaListApiOut = {
  items: MediaAssetApiOut[];
};

type MediaAppBindingApiOut = {
  app_package_name: string;
  store_type: SimulationStoreType;
  min_supported_version: string;
  max_supported_version: string;
  released_at: string | null;
  assets_count: number;
  latest_asset_at: string;
};

type MediaAppBindingListApiOut = {
  items: MediaAppBindingApiOut[];
};

type MediaUploadApiOut = {
  asset: MediaAssetApiOut;
};

type StoreResolveApiOut = {
  store_type: SimulationStoreType;
  app_name: string;
  package_name: string;
  icon_url: string | null;
  canonical_url: string | null;
};

type LibraryItemSummaryApiOut = {
  id: string;
  owner_user_id: string;
  scope_key: string;
  title: string;
  target_app_name: string | null;
  binding: {
    app_package_name: string;
    store_type: SimulationStoreType;
    min_supported_version: string;
    max_supported_version: string;
    released_at: string | null;
    icon_url: string | null;
  } | null;
  screens_count: number;
  links_count: number;
  created_at: string;
  updated_at: string;
};

type LibraryItemApiOut = LibraryItemSummaryApiOut & {
  payload_json: unknown;
};

type LibraryListApiOut = {
  items: LibraryItemSummaryApiOut[];
};

export type SimulationMediaAsset = {
  id: string;
  originalFilename: string;
  appPackageName: string;
  storeType: SimulationStoreType;
  minSupportedVersion: string;
  maxSupportedVersion: string;
  releasedAt: string | null;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  fileUrl: string;
};

export type SimulationMediaBinding = {
  appPackageName: string;
  storeType: SimulationStoreType;
  minSupportedVersion: string;
  maxSupportedVersion: string;
  releasedAt: string;
};

export type SimulationMediaAppBinding = {
  appPackageName: string;
  storeType: SimulationStoreType;
  minSupportedVersion: string;
  maxSupportedVersion: string;
  releasedAt: string | null;
  assetsCount: number;
  latestAssetAt: string;
};

export type SimulationStoreResolveResult = {
  storeType: SimulationStoreType;
  appName: string;
  packageName: string;
  iconUrl: string | null;
  canonicalUrl: string | null;
};

export type SimulationLibraryItemSummary = {
  id: string;
  title: string;
  targetAppName: string | null;
  binding: {
    appPackageName: string;
    storeType: SimulationStoreType;
    minSupportedVersion: string;
    maxSupportedVersion: string;
    releasedAt: string | null;
    iconUrl: string | null;
  } | null;
  screensCount: number;
  linksCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SimulationLibraryFilter = Partial<{
  appPackageName: string;
  storeType: SimulationStoreType;
  minSupportedVersion: string;
  maxSupportedVersion: string;
  releasedAt: string;
}>;

const inflightGetRequests = new Map<string, Promise<unknown>>();
const recentGetResponses = new Map<
  string,
  {
    expiresAt: number;
    value: unknown;
  }
>();

function toSimulationApiError(raw: string, status: number): Error {
  return new Error(
    extractApiErrorMessage(
      raw,
      status,
      "Failed to process simulation request.",
    ),
  );
}

async function getJson<T>(
  path: string,
  options?: {
    dedupeMs?: number;
  },
): Promise<T> {
  const dedupeMs = options?.dedupeMs ?? 0;
  const now = Date.now();

  if (dedupeMs > 0) {
    const cached = recentGetResponses.get(path);
    if (cached && cached.expiresAt > now) {
      return cached.value as T;
    }
  }

  const inflight = inflightGetRequests.get(path);
  if (inflight) {
    return (await inflight) as T;
  }

  const request = (async () => {
    const response = await fetch(path, {
      method: "GET",
      cache: "no-store",
    });

    const raw = await response.text();
    if (!response.ok) {
      throw toSimulationApiError(raw, response.status);
    }

    if (!raw) {
      return null as T;
    }

    return JSON.parse(raw) as T;
  })();

  inflightGetRequests.set(path, request as Promise<unknown>);

  try {
    const result = await request;
    if (dedupeMs > 0) {
      recentGetResponses.set(path, {
        value: result,
        expiresAt: Date.now() + dedupeMs,
      });
    }
    return result;
  } finally {
    inflightGetRequests.delete(path);
  }
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const raw = await response.text();
  if (!response.ok) {
    throw toSimulationApiError(raw, response.status);
  }

  if (!raw) {
    return {} as T;
  }

  return JSON.parse(raw) as T;
}

async function patchJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const raw = await response.text();
  if (!response.ok) {
    throw toSimulationApiError(raw, response.status);
  }

  if (!raw) {
    return {} as T;
  }

  return JSON.parse(raw) as T;
}

async function deleteRequest(path: string): Promise<void> {
  const response = await fetch(path, {
    method: "DELETE",
    cache: "no-store",
  });

  const raw = await response.text();
  if (!response.ok) {
    throw toSimulationApiError(raw, response.status);
  }
}

async function postForm<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  const raw = await response.text();
  if (!response.ok) {
    throw toSimulationApiError(raw, response.status);
  }

  if (!raw) {
    return {} as T;
  }

  return JSON.parse(raw) as T;
}

function withScope(path: string, scopeKey: string): string {
  const query = new URLSearchParams({
    scope_key: scopeKey,
  });
  return `${path}?${query.toString()}`;
}

function parseSimulationDraftPayload(value: unknown): SimulationDraft | null {
  return normalizeSimulationDraft(value);
}

function mapMediaAsset(value: MediaAssetApiOut): SimulationMediaAsset {
  return {
    id: value.id,
    originalFilename: value.original_filename,
    appPackageName: value.app_package_name,
    storeType: value.store_type,
    minSupportedVersion: value.min_supported_version,
    maxSupportedVersion: value.max_supported_version,
    releasedAt: value.released_at,
    contentType: value.content_type,
    sizeBytes: value.size_bytes,
    createdAt: value.created_at,
    fileUrl: `/api/admin/simulation/media/${value.id}/file`,
  };
}

function mapLibraryItemSummary(
  value: LibraryItemSummaryApiOut,
): SimulationLibraryItemSummary {
  return {
    id: value.id,
    title: value.title,
    targetAppName: value.target_app_name,
    binding: value.binding
      ? {
          appPackageName: value.binding.app_package_name,
          storeType: value.binding.store_type,
          minSupportedVersion: value.binding.min_supported_version,
          maxSupportedVersion: value.binding.max_supported_version,
          releasedAt: value.binding.released_at,
          iconUrl: value.binding.icon_url,
        }
      : null,
    screensCount: value.screens_count ?? 0,
    linksCount: value.links_count ?? 0,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

function mapMediaAppBinding(
  value: MediaAppBindingApiOut,
): SimulationMediaAppBinding {
  return {
    appPackageName: value.app_package_name,
    storeType: value.store_type,
    minSupportedVersion: value.min_supported_version,
    maxSupportedVersion: value.max_supported_version,
    releasedAt: value.released_at,
    assetsCount: value.assets_count,
    latestAssetAt: value.latest_asset_at,
  };
}

function buildMediaQuery(
  scopeKey: string,
  searchQuery: string,
  binding: SimulationMediaBinding,
): URLSearchParams {
  const query = new URLSearchParams({
    scope_key: scopeKey,
    search_query: searchQuery,
    limit: "80",
    app_package_name: binding.appPackageName,
    store_type: binding.storeType,
    min_supported_version: binding.minSupportedVersion,
    max_supported_version: binding.maxSupportedVersion,
  });
  if (binding.releasedAt.trim()) {
    query.set("released_at", binding.releasedAt.trim());
  }
  return query;
}

export async function fetchCurrentSimulationDraftRemote(
  scopeKey: string,
): Promise<SimulationDraft | null> {
  const data = await getJson<DraftApiOut | null>(
    withScope("/api/admin/simulation/drafts/current", scopeKey),
    { dedupeMs: 800 },
  );

  if (!data) {
    return null;
  }

  return parseSimulationDraftPayload(data.payload_json);
}

export async function saveCurrentSimulationDraftRemote(
  draft: SimulationDraft,
  scopeKey: string,
): Promise<SimulationDraft | null> {
  const data = await postJson<DraftApiOut>(
    withScope("/api/admin/simulation/drafts/current", scopeKey),
    {
      title: draft.title,
      payload_json: draft,
    },
  );

  return parseSimulationDraftPayload(data.payload_json);
}

export async function fetchSimulationMediaAssetsRemote(
  scopeKey: string,
  searchQuery: string,
  binding: SimulationMediaBinding,
): Promise<SimulationMediaAsset[]> {
  const query = buildMediaQuery(scopeKey, searchQuery, binding);
  const data = await getJson<MediaListApiOut>(
    `/api/admin/simulation/media?${query.toString()}`,
  );
  return (data.items ?? []).map(mapMediaAsset);
}

export async function fetchSimulationMediaAppBindingsRemote(
  scopeKey: string,
  searchQuery: string,
): Promise<SimulationMediaAppBinding[]> {
  const query = new URLSearchParams({
    scope_key: scopeKey,
    search_query: searchQuery.trim(),
    limit: "60",
  });
  const data = await getJson<MediaAppBindingListApiOut>(
    `/api/admin/simulation/media/apps?${query.toString()}`,
    { dedupeMs: 800 },
  );
  return (data.items ?? []).map(mapMediaAppBinding);
}

export async function uploadSimulationMediaAssetRemote(
  scopeKey: string,
  file: File,
  binding: SimulationMediaBinding,
): Promise<SimulationMediaAsset> {
  const query = buildMediaQuery(scopeKey, "", binding);
  const formData = new FormData();
  formData.set("file", file);
  const data = await postForm<MediaUploadApiOut>(
    `/api/admin/simulation/media?${query.toString()}`,
    formData,
  );
  return mapMediaAsset(data.asset);
}

export async function renameSimulationMediaAssetRemote(
  assetId: string,
  originalFilename: string,
): Promise<SimulationMediaAsset> {
  const data = await patchJson<MediaAssetApiOut>(
    `/api/admin/simulation/media/${encodeURIComponent(assetId)}`,
    {
      original_filename: originalFilename,
    },
  );
  return mapMediaAsset(data);
}

export async function deleteSimulationMediaAssetRemote(
  assetId: string,
): Promise<void> {
  await deleteRequest(
    `/api/admin/simulation/media/${encodeURIComponent(assetId)}`,
  );
}

export async function resolveSimulationStoreAppRemote(
  storeUrl: string,
): Promise<SimulationStoreResolveResult> {
  const data = await postJson<StoreResolveApiOut>(
    "/api/admin/simulation/store/resolve",
    {
      store_url: storeUrl,
    },
  );

  return {
    storeType: data.store_type,
    appName: data.app_name,
    packageName: data.package_name,
    iconUrl: data.icon_url,
    canonicalUrl: data.canonical_url,
  };
}

export async function fetchSimulationLibraryRemote(
  scopeKey: string,
  searchQuery: string,
  filter?: SimulationLibraryFilter,
): Promise<SimulationLibraryItemSummary[]> {
  const query = new URLSearchParams({
    scope_key: scopeKey,
    search_query: searchQuery,
    limit: "60",
  });
  if (filter?.appPackageName?.trim()) {
    query.set("app_package_name", filter.appPackageName.trim());
  }
  if (filter?.storeType?.trim()) {
    query.set("store_type", filter.storeType.trim());
  }
  if (filter?.minSupportedVersion?.trim()) {
    query.set("min_supported_version", filter.minSupportedVersion.trim());
  }
  if (filter?.maxSupportedVersion?.trim()) {
    query.set("max_supported_version", filter.maxSupportedVersion.trim());
  }
  if (filter?.releasedAt?.trim()) {
    query.set("released_at", filter.releasedAt.trim());
  }
  const data = await getJson<LibraryListApiOut>(
    `/api/admin/simulation/library?${query.toString()}`,
  );
  return (data.items ?? []).map(mapLibraryItemSummary);
}

export async function saveSimulationLibraryItemRemote(
  scopeKey: string,
  payload: {
    title?: string;
    draft: SimulationDraft;
  },
): Promise<SimulationLibraryItemSummary> {
  const query = new URLSearchParams({
    scope_key: scopeKey,
  });
  const data = await postJson<LibraryItemSummaryApiOut>(
    `/api/admin/simulation/library?${query.toString()}`,
    {
      title: payload.title,
      payload_json: payload.draft,
    },
  );
  return mapLibraryItemSummary(data);
}

export async function updateSimulationLibraryItemRemote(
  itemId: string,
  payload: {
    title?: string;
    draft: SimulationDraft;
  },
): Promise<SimulationLibraryItemSummary> {
  const data = await patchJson<LibraryItemSummaryApiOut>(
    `/api/admin/simulation/library/${encodeURIComponent(itemId)}`,
    {
      title: payload.title,
      payload_json: payload.draft,
    },
  );
  return mapLibraryItemSummary(data);
}

export async function loadSimulationLibraryItemRemote(
  itemId: string,
): Promise<SimulationDraft | null> {
  const data = await getJson<LibraryItemApiOut>(
    `/api/admin/simulation/library/${encodeURIComponent(itemId)}`,
  );
  return parseSimulationDraftPayload(data.payload_json);
}

export async function deleteSimulationLibraryItemRemote(
  itemId: string,
): Promise<void> {
  const response = await fetch(
    `/api/admin/simulation/library/${encodeURIComponent(itemId)}`,
    {
      method: "DELETE",
      cache: "no-store",
    },
  );

  const raw = await response.text();
  if (!response.ok) {
    throw toSimulationApiError(raw, response.status);
  }
}
