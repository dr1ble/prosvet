import { apiBaseUrl } from "@/shared/config";

import type {
  CourseDto,
  CourseReleaseDto,
  CourseReleaseFilters,
  CourseStatus,
} from "./types";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(
      `Request failed (${response.status}): ${payload || response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

export async function fetchCourses(): Promise<CourseDto[]> {
  return fetchJson<CourseDto[]>(
    "/catalog/courses?include_drafts=true&include_archived=true",
  );
}

export async function fetchCourseReleases(
  courseId: string,
  accessToken: string,
  filters: CourseReleaseFilters = {},
): Promise<CourseReleaseDto[]> {
  const params = new URLSearchParams();
  if (filters.status) {
    params.set("status", filters.status);
  }
  const trimmedVersion = filters.versionQuery?.trim();
  if (trimmedVersion) {
    params.set("version_query", trimmedVersion);
  }
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }

  const querySuffix = params.size > 0 ? `?${params.toString()}` : "";
  return fetchJson<CourseReleaseDto[]>(
    `/catalog/courses/${courseId}/releases${querySuffix}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
}

export async function updateCourseStatus(
  courseId: string,
  status: CourseStatus,
): Promise<CourseDto> {
  const response = await fetch(`/api/admin/catalog/courses/${courseId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  const payload = await response.text();
  if (!response.ok) {
    throw new Error(
      `Request failed (${response.status}): ${payload || response.statusText}`,
    );
  }

  return payload ? (JSON.parse(payload) as CourseDto) : ({} as CourseDto);
}

export async function deleteCourse(courseId: string): Promise<void> {
  const response = await fetch(`/api/admin/catalog/courses/${courseId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const payload = await response.text();
    let detail = payload || response.statusText;
    try {
      const parsed = JSON.parse(payload) as { detail?: string };
      if (parsed?.detail) {
        detail = parsed.detail;
      }
    } catch {
      // keep raw payload
    }
    throw new Error(`Request failed (${response.status}): ${detail}`);
  }
}
