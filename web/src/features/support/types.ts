export type HelpRequestStatus = "new" | "in_progress" | "resolved";

export type HelpRequestType =
  | "lesson_help"
  | "mentor_question"
  | "technical_issue";

export type HelpRequestDto = {
  id: string;
  requester_id: string;
  requester_name: string | null;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  course_id: string | null;
  course_title: string | null;
  lesson_id: string | null;
  lesson_title: string | null;
  screen_key: string | null;
  screen_title: string | null;
  request_type: HelpRequestType;
  status: HelpRequestStatus;
  message: string;
  staff_comment: string | null;
  created_at: string;
  updated_at: string;
};

export type HelpRequestsResponse = {
  requests: HelpRequestDto[];
};
