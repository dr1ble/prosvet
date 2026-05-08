import { apiBaseUrl } from "@/shared/config";
import { extractApiErrorMessage } from "@/shared/lib/api-error";

import type { UsersOverviewDto } from "./types";
import type { UserOverviewItemDto } from "./types";

export type OnboardingQrDto = {
  deep_link_url: string;
  expires_at: string;
};

export type CreateUserPayload = {
  display_name?: string | null;
  login: string;
  password: string;
  role: string;
  status: string;
};

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

export async function createUser(
  payload: CreateUserPayload,
): Promise<UserOverviewItemDto> {
  const response = await fetch("/api/admin/users", {
    method: "POST",
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
        "Не удалось добавить пользователя.",
      ),
    );
  }
  return raw
    ? (JSON.parse(raw) as UserOverviewItemDto)
    : ({} as UserOverviewItemDto);
}

export async function generateOnboardingLoginQr(): Promise<OnboardingQrDto> {
  const response = await fetch("/api/admin/auth/qr/onboarding", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      extractApiErrorMessage(
        raw,
        response.status,
        "Не удалось сформировать QR для нового пользователя.",
      ),
    );
  }
  return raw ? (JSON.parse(raw) as OnboardingQrDto) : ({} as OnboardingQrDto);
}
