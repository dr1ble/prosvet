export type CourseStatus = "draft" | "active" | "archived";
export type ReleaseStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "published";

export interface CourseDto {
  id: string;
  author_id: string | null;
  author_display_name: string | null;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  status: CourseStatus;
  created_at: string;
  updated_at: string;
}

export interface CourseReleaseDto {
  id: string;
  course_id: string;
  version: string;
  changelog: string | null;
  status: ReleaseStatus;
  published_at: string | null;
  created_at: string;
  screen_count: number;
}

export interface CourseReleaseFilters {
  status?: ReleaseStatus;
  versionQuery?: string;
  limit?: number;
}

export interface ReleaseScreenInput {
  screen_key: string;
  title: string;
  order_index: number;
  payload: Record<string, unknown>;
}

export interface CourseCreateInput {
  slug: string;
  title: string;
  description?: string | null;
  status: CourseStatus;
}

export interface CourseReleaseCreateInput {
  version: string;
  changelog?: string | null;
  status: ReleaseStatus;
  screens: ReleaseScreenInput[];
}

export interface CourseLessonCreateInput {
  title: string;
  description?: string | null;
}

export interface CourseLessonUpdateInput {
  title: string;
  description?: string | null;
  status: CourseLessonStatus;
}

export interface CourseLessonDto {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  status: CourseLessonStatus;
  created_at: string;
  updated_at: string;
}

export type CourseLessonStatus = "draft" | "active" | "archived";

export type TaskType =
  | "theory_text"
  | "theory_video"
  | "quiz"
  | "simulation"
  | "cheat_sheet";

export interface LessonTaskCreateInput {
  task_type: TaskType;
  title: string;
  required?: boolean;
  payload: Record<string, unknown>;
}

export interface LessonTaskUpdateInput {
  title: string;
  required?: boolean;
  payload: Record<string, unknown>;
}

export interface LessonTaskDto {
  id: string;
  lesson_id: string;
  task_type: TaskType;
  title: string;
  order_index: number;
  required: boolean;
  payload: Record<string, unknown>;
  checksum: string;
  created_at: string;
}

export interface ReorderInput {
  order_index: number;
}

export interface CourseStructureTask {
  id: string;
  task_type: TaskType;
  title: string;
  order_index: number;
  required: boolean;
}

export interface CourseStructureLesson {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  tasks: CourseStructureTask[];
}

export interface CourseStructure {
  course_id: string;
  course_title: string;
  lessons: CourseStructureLesson[];
}

export interface ValidationError {
  type: string;
  message: string;
  lesson_id?: string;
  lesson_title?: string;
  task_id?: string;
  task_title?: string;
}

export interface ValidationWarning {
  type: string;
  message: string;
  lesson_id?: string;
  lesson_title?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ModerationReviewDto {
  id: string;
  release_id: string;
  reviewer_user_id: string;
  decision: string;
  comment: string | null;
  decided_at: string;
  created_at: string;
}

export interface ModerationHistoryDto {
  id: string;
  release_id: string;
  from_status: string;
  to_status: string;
  actor_user_id: string;
  reason: string | null;
  changed_at: string;
}

export interface PendingReleaseDto {
  release_id: string;
  course_id: string;
  version: string;
  status: string;
  submitted_at: string;
  author_id: string | null;
}
