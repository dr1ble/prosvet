import { extractApiErrorMessage } from "@/shared/lib/api-error";

import type {
  ModerationHistoryDto,
  ModerationReviewDto,
  PendingReleaseDto,
} from "@/features/catalog/types";

const ADMIN_PROXY = "/api/admin";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${ADMIN_PROXY}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const payload = await response.text();

  if (!response.ok) {
    throw new Error(
      extractApiErrorMessage(
        payload,
        response.status,
        "Failed to load moderation data.",
      ),
    );
  }

  if (!payload) {
    return {} as T;
  }

  return JSON.parse(payload) as T;
}

export async function fetchPendingReleases(): Promise<PendingReleaseDto[]> {
  return fetchJson<PendingReleaseDto[]>("/moderation/releases/pending");
}

export async function fetchReleaseHistory(
  releaseId: string,
): Promise<ModerationHistoryDto[]> {
  return fetchJson<ModerationHistoryDto[]>(
    `/moderation/releases/${releaseId}/history`,
  );
}

export async function submitRelease(
  releaseId: string,
  comment?: string,
): Promise<ModerationReviewDto> {
  return fetchJson<ModerationReviewDto>(
    `/moderation/releases/${releaseId}/submit`,
    {
      method: "POST",
      body: JSON.stringify({ comment: comment || null }),
    },
  );
}

export async function approveRelease(
  releaseId: string,
  comment?: string,
): Promise<ModerationReviewDto> {
  return fetchJson<ModerationReviewDto>(
    `/moderation/releases/${releaseId}/approve`,
    {
      method: "POST",
      body: JSON.stringify({ comment: comment || null }),
    },
  );
}

export async function rejectRelease(
  releaseId: string,
  comment: string,
): Promise<ModerationReviewDto> {
  return fetchJson<ModerationReviewDto>(
    `/moderation/releases/${releaseId}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ comment }),
    },
  );
}

export async function resubmitRelease(
  releaseId: string,
  comment?: string,
): Promise<ModerationReviewDto> {
  return fetchJson<ModerationReviewDto>(
    `/moderation/releases/${releaseId}/resubmit`,
    {
      method: "POST",
      body: JSON.stringify({ comment: comment || null }),
    },
  );
}
