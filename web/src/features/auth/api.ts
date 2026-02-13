"use client";

type OtpRequestOut = {
  challenge_id: string;
  status: string;
  dev_code?: string | null;
};

type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
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
      `Request failed (${response.status}): ${raw || response.statusText}`,
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
      `Request failed (${response.status}): ${raw || response.statusText}`,
    );
  }

  if (!raw) {
    return {} as T;
  }
  return JSON.parse(raw) as T;
}

export function requestOtp(phone: string): Promise<OtpRequestOut> {
  return postJson<OtpRequestOut>("/api/admin/auth/otp/request", { phone });
}

export function verifyOtp(phone: string, code: string): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/admin/auth/otp/verify", { phone, code });
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
