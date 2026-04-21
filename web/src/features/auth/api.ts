"use client";

import { extractApiErrorMessage } from "@/shared/lib/api-error";

type AuthResponse = {
  status: string;
};

type LogoutOut = {
  status: string;
};

export type AdminAuthMe = {
  user_id: string;
  role: string;
  status: string;
  display_name: string | null;
  permissions: string[];
};

async function postJson<T>(path: string, payload?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : "{}",
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      extractApiErrorMessage(
        raw,
        response.status,
        "Не удалось выполнить запрос.",
      ),
    );
  }

  if (!raw) {
    return {} as T;
  }
  return JSON.parse(raw) as T;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    method: "GET",
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      extractApiErrorMessage(
        raw,
        response.status,
        "Не удалось загрузить данные профиля.",
      ),
    );
  }

  if (!raw) {
    return {} as T;
  }
  return JSON.parse(raw) as T;
}

export function loginAdmin(
  login: string,
  password: string,
): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/admin/auth/login", {
    login,
    password,
  });
}

export function refreshAdminSession(): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/admin/auth/refresh");
}

export function logoutAdminSession(): Promise<LogoutOut> {
  return postJson<LogoutOut>("/api/admin/auth/logout");
}

export function fetchAdminAuthMe(): Promise<AdminAuthMe> {
  return getJson<AdminAuthMe>("/api/admin/auth/me");
}

export function updateAdminProfile(payload: {
  display_name: string | null;
}): Promise<AdminAuthMe> {
  return fetch("/api/admin/auth/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).then(async (response) => {
    const raw = await response.text();
    if (!response.ok) {
      throw new Error(
        extractApiErrorMessage(
          raw,
          response.status,
          "Не удалось обновить профиль.",
        ),
      );
    }
    return raw ? (JSON.parse(raw) as AdminAuthMe) : ({} as AdminAuthMe);
  });
}
