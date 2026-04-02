import { apiBaseUrl } from "@/shared/config";
import { extractApiErrorMessage } from "@/shared/lib/api-error";

import type {
  AssignmentStartPolicy,
  AssignmentStatus,
  GroupAssignmentDto,
  GroupDto,
  GroupMemberDto,
  GroupStatus,
  GroupUserOptionDto,
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
        "Не удалось загрузить данные групп.",
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
        "Не удалось выполнить действие с группой.",
      ),
    );
  }
  if (!raw) {
    return {} as T;
  }
  return JSON.parse(raw) as T;
}

export function fetchGroups(accessToken: string): Promise<GroupDto[]> {
  return fetchBackendJson<GroupDto[]>("/groups", accessToken);
}

export function fetchGroupUsers(
  accessToken: string,
): Promise<GroupUserOptionDto[]> {
  return fetchBackendJson<GroupUserOptionDto[]>("/groups/users", accessToken);
}

export function fetchGroupMembers(
  accessToken: string,
  groupId: string,
): Promise<GroupMemberDto[]> {
  return fetchBackendJson<GroupMemberDto[]>(
    `/groups/${groupId}/members`,
    accessToken,
  );
}

export function fetchGroupAssignments(
  accessToken: string,
  groupId: string,
): Promise<GroupAssignmentDto[]> {
  return fetchBackendJson<GroupAssignmentDto[]>(
    `/groups/${groupId}/assignments`,
    accessToken,
  );
}

export function createGroup(payload: {
  name: string;
  description?: string;
  status?: GroupStatus;
}): Promise<GroupDto> {
  return fetchAdminJson<GroupDto>("/api/admin/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateGroup(
  groupId: string,
  payload: {
    name?: string;
    description?: string;
    status?: GroupStatus;
  },
): Promise<GroupDto> {
  return fetchAdminJson<GroupDto>(`/api/admin/groups/${groupId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function archiveGroup(groupId: string): Promise<GroupDto> {
  return fetchAdminJson<GroupDto>(`/api/admin/groups/${groupId}/archive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}

export function restoreGroup(groupId: string): Promise<GroupDto> {
  return fetchAdminJson<GroupDto>(`/api/admin/groups/${groupId}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}

export function replaceGroupMembers(
  groupId: string,
  userIds: string[],
): Promise<GroupMemberDto[]> {
  return fetchAdminJson<GroupMemberDto[]>(
    `/api/admin/groups/${groupId}/members`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_ids: userIds }),
    },
  );
}

export function createGroupAssignment(
  groupId: string,
  payload: {
    course_id: string;
    target_user_ids?: string[];
    start_policy: AssignmentStartPolicy;
    starts_at?: string | null;
    ends_at?: string | null;
    status?: AssignmentStatus;
  },
): Promise<GroupAssignmentDto> {
  return fetchAdminJson<GroupAssignmentDto>(
    `/api/admin/groups/${groupId}/assignments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

export function updateGroupAssignment(
  groupId: string,
  assignmentId: string,
  payload: {
    target_user_ids?: string[];
    starts_at?: string | null;
    ends_at?: string | null;
    status?: AssignmentStatus;
  },
): Promise<GroupAssignmentDto> {
  return fetchAdminJson<GroupAssignmentDto>(
    `/api/admin/groups/${groupId}/assignments/${assignmentId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}
