import { apiBaseUrl } from "@/shared/config";
import { extractApiErrorMessage } from "@/shared/lib/api-error";

import type { SearchRequest, SearchResponse } from "./types";

async function fetchBackendJson<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      extractApiErrorMessage(
        raw,
        response.status,
        "Не удалось выполнить поиск.",
      ),
    );
  }
  if (!raw) {
    return {} as T;
  }
  return JSON.parse(raw) as T;
}

async function fetchAdminJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      extractApiErrorMessage(
        raw,
        response.status,
        "Не удалось выполнить поиск.",
      ),
    );
  }
  if (!raw) {
    return {} as T;
  }
  return JSON.parse(raw) as T;
}

export function search(
  query: string,
  accessToken: string,
  options?: {
    types?: SearchRequest["types"];
    limit?: number;
  },
): Promise<SearchResponse> {
  const params = new URLSearchParams();
  params.set("q", query);
  if (options?.types) {
    for (const type of options.types) {
      params.append("types", type);
    }
  }
  if (options?.limit) {
    params.set("limit", String(options.limit));
  }

  return fetchBackendJson<SearchResponse>(
    `/search?${params.toString()}`,
    accessToken,
  );
}

export function searchViaProxy(
  query: string,
  options?: {
    types?: SearchRequest["types"];
    limit?: number;
  },
): Promise<SearchResponse> {
  const params = new URLSearchParams();
  params.set("q", query);
  if (options?.types) {
    for (const type of options.types) {
      params.append("types", type);
    }
  }
  if (options?.limit) {
    params.set("limit", String(options.limit));
  }

  return fetchAdminJson<SearchResponse>(
    `/api/admin/search?${params.toString()}`,
  );
}
