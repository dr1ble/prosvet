export type UserOverviewItemDto = {
  user_id: string;
  login: string | null;
  display_name: string | null;
  role: string;
  status: string;
  permissions: string[];
};

export type UserRoleSummaryDto = {
  role: string;
  count: number;
  permissions: string[];
};

export type UsersOverviewDto = {
  users: UserOverviewItemDto[];
  role_summary: UserRoleSummaryDto[];
};
