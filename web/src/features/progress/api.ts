import { apiBaseUrl } from "@/shared/config";
import { extractApiErrorMessage } from "@/shared/lib/api-error";

import type {
  LessonAnalyticsOverviewRowDto,
  ProgressOverviewRowDto,
  ProgressTimeseriesPointDto,
} from "./types";

type ProgressFilters = {
  groupId?: string;
  courseId?: string;
  userId?: string;
  period?: "all" | "7d" | "14d" | "30d" | "90d" | "custom";
  dateFrom?: string;
  dateTo?: string;
};

function buildProgressParams(filters: ProgressFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.groupId) params.set("group_id", filters.groupId);
  if (filters.courseId) params.set("course_id", filters.courseId);
  if (filters.userId) params.set("user_id", filters.userId);
  if (filters.period) params.set("period", filters.period);
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);
  return params;
}

async function fetchProgressJson<T>(
  accessToken: string,
  path: string,
  errorMessage: string,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(extractApiErrorMessage(raw, response.status, errorMessage));
  }
  if (!raw) {
    return [] as T;
  }
  return JSON.parse(raw) as T;
}

export async function fetchProgressOverview(
  accessToken: string,
  filters: ProgressFilters,
): Promise<ProgressOverviewRowDto[]> {
  const params = buildProgressParams(filters);
  const path = params.toString()
    ? `/progress/overview?${params.toString()}`
    : "/progress/overview";
  return fetchProgressJson<ProgressOverviewRowDto[]>(
    accessToken,
    path,
    "Не удалось загрузить отчет по прогрессу.",
  );
}

export async function fetchProgressTimeseries(
  accessToken: string,
  filters: ProgressFilters,
): Promise<ProgressTimeseriesPointDto[]> {
  const params = buildProgressParams(filters);
  const path = params.toString()
    ? `/progress/timeseries?${params.toString()}`
    : "/progress/timeseries";
  return fetchProgressJson<ProgressTimeseriesPointDto[]>(
    accessToken,
    path,
    "Не удалось загрузить динамику прогресса.",
  );
}

export async function fetchLessonAnalyticsOverview(
  accessToken: string,
  filters: ProgressFilters,
): Promise<LessonAnalyticsOverviewRowDto[]> {
  const params = buildProgressParams(filters);
  const path = params.toString()
    ? `/progress/analytics/lessons?${params.toString()}`
    : "/progress/analytics/lessons";
  return fetchProgressJson<LessonAnalyticsOverviewRowDto[]>(
    accessToken,
    path,
    "Не удалось загрузить аналитику по урокам.",
  );
}
