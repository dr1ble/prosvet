import type { AdminAuthMe } from "@/features/auth/api";
import { apiBaseUrl } from "@/shared/config";

export async function fetchAdminAuthMeServer(
  accessToken: string,
): Promise<AdminAuthMe> {
  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      `Failed to load admin profile (${response.status}): ${raw || response.statusText}`,
    );
  }

  if (!raw) {
    throw new Error("Admin profile response is empty.");
  }

  return JSON.parse(raw) as AdminAuthMe;
}
