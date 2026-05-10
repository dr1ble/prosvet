export type ProgressOverviewRowDto = {
  assignment_id: string;
  assignment_status: string;
  group_id: string;
  group_name: string;
  course_id: string;
  course_title: string;
  user_id: string;
  user_login: string | null;
  user_display_name: string | null;
  total_lessons: number;
  completed_lessons: number;
  completion_rate: number;
};

export type ProgressTimeseriesPointDto = {
  date: string;
  completed_lessons_count: number;
};

export type LessonAnalyticsOverviewRowDto = {
  lesson_id: string;
  lesson_title: string;
  course_id: string;
  course_title: string;
  sessions_count: number;
  completed_sessions_count: number;
  avg_duration_seconds: number;
  avg_error_attempts: number;
  hint_level3_share: number;
};
