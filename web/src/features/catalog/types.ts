export type CourseStatus = "draft" | "active" | "archived";
export type ReleaseStatus = "draft" | "published";

export interface CourseDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
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
