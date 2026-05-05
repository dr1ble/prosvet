import { apiBaseUrl } from "@/shared/config";
import { extractApiErrorMessage } from "@/shared/lib/api-error";

import type {
  HelpRequestDto,
  HelpRequestsResponse,
  HelpRequestStatus,
  HelpRequestType,
} from "./types";

export async function fetchHelpRequests(
  accessToken: string,
  filters: {
    status?: string;
    requestType?: string;
    courseId?: string;
  } = {},
): Promise<HelpRequestDto[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.requestType) params.set("request_type", filters.requestType);
  if (filters.courseId) params.set("course_id", filters.courseId);

  const path = params.toString()
    ? `/support/help-requests?${params.toString()}`
    : "/support/help-requests";
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      extractApiErrorMessage(
        raw,
        response.status,
        "Не удалось загрузить заявки помощи.",
      ),
    );
  }
  if (!raw) return [];
  return (JSON.parse(raw) as HelpRequestsResponse).requests;
}

export async function updateHelpRequest(
  accessToken: string,
  requestId: string,
  payload: {
    status: HelpRequestStatus;
    staffComment?: string;
  },
): Promise<HelpRequestDto> {
  const response = await fetch(
    `${apiBaseUrl}/support/help-requests/${requestId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: payload.status,
        staff_comment: payload.staffComment || null,
      }),
      cache: "no-store",
    },
  );
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      extractApiErrorMessage(
        raw,
        response.status,
        "Не удалось обновить заявку помощи.",
      ),
    );
  }
  return JSON.parse(raw) as HelpRequestDto;
}

export function helpRequestTypeLabel(type: HelpRequestType): string {
  if (type === "lesson_help") return "Нужна помощь с шагом";
  if (type === "mentor_question") return "Вопрос куратору";
  return "Проблема в курсе";
}

export function helpRequestStatusLabel(status: HelpRequestStatus): string {
  if (status === "new") return "Новая";
  if (status === "in_progress") return "В работе";
  return "Закрыта";
}
