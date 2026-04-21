import { apiBaseUrl } from "@/shared/config";
import { extractApiErrorMessage } from "@/shared/lib/api-error";

import type {
  EffectivePoliciesOut,
  PolicyMatrixOut,
  PolicyRuleOut,
} from "./types";

async function fetchBackendJson<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      extractApiErrorMessage(
        raw,
        response.status,
        "Не удалось загрузить данные политик.",
      ),
    );
  }
  if (!raw) {
    return {} as T;
  }
  return JSON.parse(raw) as T;
}

async function fetchAdminJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      extractApiErrorMessage(
        raw,
        response.status,
        "Не удалось выполнить действие с политикой.",
      ),
    );
  }
  if (!raw) {
    return {} as T;
  }
  return JSON.parse(raw) as T;
}

export function fetchPolicies(accessToken: string): Promise<PolicyRuleOut[]> {
  return fetchBackendJson<PolicyRuleOut[]>("/rbac/policies", accessToken);
}

export function fetchEffectivePolicies(
  accessToken: string,
): Promise<EffectivePoliciesOut> {
  return fetchBackendJson<EffectivePoliciesOut>(
    "/rbac/policies/effective",
    accessToken,
  );
}

export function fetchPolicyMatrix(
  accessToken: string,
  policyKey: string,
): Promise<PolicyMatrixOut> {
  return fetchBackendJson<PolicyMatrixOut>(
    `/rbac/policies/${policyKey}`,
    accessToken,
  );
}

export function updatePolicyMatrix(
  policyKey: string,
  roles: string[],
): Promise<PolicyMatrixOut> {
  return fetchAdminJson<PolicyMatrixOut>(
    `/api/admin/rbac/policies/${policyKey}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roles }),
    },
  );
}

export function togglePolicyRule(
  policyKey: string,
  role: string,
  enabled: boolean,
): Promise<PolicyRuleOut> {
  return fetchAdminJson<PolicyRuleOut>(
    `/api/admin/rbac/policies/${policyKey}/${role}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    },
  );
}

export function deletePolicyRule(
  policyKey: string,
  role: string,
): Promise<void> {
  return fetchAdminJson<void>(`/api/admin/rbac/policies/${policyKey}/${role}`, {
    method: "DELETE",
  });
}
