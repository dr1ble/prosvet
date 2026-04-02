import { apiBaseUrl } from "@/shared/config";
import { extractApiErrorMessage } from "@/shared/lib/api-error";

import type { UsersOverviewDto } from "./types";
import type { UserOverviewItemDto } from "./types";

export async function fetchUsersOverview(
  accessToken: string,
): Promise<UsersOverviewDto> {
  const response = await fetch(`${apiBaseUrl}/users/overview`, {
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
        "Не удалось загрузить пользователей.",
      ),
    );
  }
  return raw
    ? (JSON.parse(raw) as UsersOverviewDto)
    : { users: [], role_summary: [] };
}

export async function updateUser(
  userId: string,
  payload: {
    display_name?: string | null;
    role?: string;
    status?: string;
  },
): Promise<UserOverviewItemDto> {
  const response = await fetch(`/api/admin/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      extractApiErrorMessage(
        raw,
        response.status,
        "Не удалось обновить пользователя.",
      ),
    );
  }
  return raw
    ? (JSON.parse(raw) as UserOverviewItemDto)
    : ({} as UserOverviewItemDto);
}
