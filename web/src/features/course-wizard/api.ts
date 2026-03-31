import type { CourseDto, ValidationResult } from "../catalog/types";

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      `Request failed (${response.status}): ${raw || response.statusText}`,
    );
  }
  if (!raw) return {} as T;
  return JSON.parse(raw) as T;
}

export function createCourse(data: {
  title: string;
  slug: string;
  description?: string;
  status: string;
}): Promise<CourseDto> {
  return requestJson<CourseDto>("/api/admin/catalog/courses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCourse(
  courseId: string,
  data: { title?: string; description?: string },
): Promise<CourseDto> {
  return requestJson<CourseDto>(`/api/admin/catalog/courses/${courseId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function validateCourse(courseId: string): Promise<ValidationResult> {
  return requestJson<ValidationResult>(
    `/api/admin/catalog/courses/${courseId}/validate`,
    { method: "POST" },
  );
}

export function publishCourse(
  courseId: string,
  version: string,
  changelog?: string,
): Promise<unknown> {
  return requestJson(`/api/admin/catalog/courses/${courseId}/publish`, {
    method: "POST",
    body: JSON.stringify({ version, changelog: changelog || null }),
  });
}

export {
  listCourseLessons,
  createCourseLesson,
  updateCourseLesson,
  archiveCourseLesson,
  listLessonTasks,
  createLessonTask,
  updateLessonTask,
  archiveLessonTask,
  getCourseStructure,
} from "../catalog/builder-api";
