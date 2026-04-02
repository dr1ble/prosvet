export type GroupStatus = "active" | "archived";

export type AssignmentStartPolicy = "immediate" | "scheduled";

export type AssignmentStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "completed"
  | "cancelled";

export type GroupDto = {
  id: string;
  name: string;
  description: string | null;
  status: GroupStatus;
  created_at: string;
  updated_at: string;
};

export type GroupMemberDto = {
  user_id: string;
  login: string | null;
  display_name: string | null;
  role: string;
  status: string;
  joined_at: string;
};

export type GroupUserOptionDto = {
  user_id: string;
  login: string | null;
  display_name: string | null;
  role: string;
  status: string;
};

export type GroupAssignmentDto = {
  id: string;
  group_id: string;
  course_id: string;
  course_title: string;
  created_by_user_id: string;
  start_policy: AssignmentStartPolicy;
  starts_at: string | null;
  ends_at: string | null;
  status: AssignmentStatus;
  target_user_ids: string[];
  target_users_count: number;
  created_at: string;
  updated_at: string;
};
