import { apiBaseUrl } from "@/shared/config";
import { extractApiErrorMessage } from "@/shared/lib/api-error";

import type { ProgressOverviewRowDto } from "./types";

export async function fetchProgressOverview(
  accessToken: string,
  filters: {
    groupId?: string;
    courseId?: string;
    userId?: string;
    period?: "all" | "7d" | "14d" | "30d" | "90d" | "custom";
    dateFrom?: string;
    dateTo?: string;
  },
): Promise<ProgressOverviewRowDto[]> {
  const params = new URLSearchParams();
  if (filters.groupId) params.set("group_id", filters.groupId);
  if (filters.courseId) params.set("course_id", filters.courseId);
  if (filters.userId) params.set("user_id", filters.userId);
  if (filters.period) params.set("period", filters.period);
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);

  const path = params.toString()
    ? `/progress/overview?${params.toString()}`
    : "/progress/overview";

  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      extractApiErrorMessage(
        raw,
        response.status,
        "Не удалось загрузить отчет по прогрессу.",
      ),
    );
  }
  if (!raw) {
    return [];
  }
  return JSON.parse(raw) as ProgressOverviewRowDto[];
}
