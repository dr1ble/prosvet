"use client";

import type {
  CourseLessonCreateInput,
  CourseLessonDto,
  CourseLessonUpdateInput,
  CourseStructure,
  LessonTaskCreateInput,
  LessonTaskDto,
  LessonTaskUpdateInput,
  ReorderInput,
  ValidationResult,
} from "./types";
import { extractApiErrorMessage } from "@/shared/lib/api-error";

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      extractApiErrorMessage(
        raw,
        response.status,
        "Failed to process course builder action.",
      ),
    );
  }
  if (!raw) {
    return {} as T;
  }
  return JSON.parse(raw) as T;
}

export function listCourseLessons(
  courseId: string,
  includeArchived = false,
): Promise<CourseLessonDto[]> {
  return requestJson<CourseLessonDto[]>(
    `/api/admin/catalog/courses/${courseId}/lessons?include_archived=${includeArchived}`,
    { method: "GET" },
  );
}

export function createCourseLesson(
  courseId: string,
  payload: CourseLessonCreateInput,
): Promise<CourseLessonDto> {
  return requestJson<CourseLessonDto>(
    `/api/admin/catalog/courses/${courseId}/lessons`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateCourseLesson(
  lessonId: string,
  payload: CourseLessonUpdateInput,
): Promise<CourseLessonDto> {
  return requestJson<CourseLessonDto>(
    `/api/admin/catalog/lessons/${lessonId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function archiveCourseLesson(lessonId: string): Promise<void> {
  return requestJson<void>(`/api/admin/catalog/lessons/${lessonId}`, {
    method: "DELETE",
  });
}

export function restoreCourseLesson(
  lessonId: string,
): Promise<CourseLessonDto> {
  return requestJson<CourseLessonDto>(
    `/api/admin/catalog/lessons/${lessonId}/restore`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export function reorderCourseLesson(
  courseId: string,
  lessonId: string,
  payload: ReorderInput,
): Promise<void> {
  return requestJson<void>(
    `/api/admin/catalog/courses/${courseId}/lessons/${lessonId}/reorder`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function listLessonTasks(lessonId: string): Promise<LessonTaskDto[]> {
  return requestJson<LessonTaskDto[]>(
    `/api/admin/catalog/lessons/${lessonId}/tasks`,
    {
      method: "GET",
    },
  );
}

export function createLessonTask(
  lessonId: string,
  payload: LessonTaskCreateInput,
): Promise<LessonTaskDto> {
  return requestJson<LessonTaskDto>(
    `/api/admin/catalog/lessons/${lessonId}/tasks`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateLessonTask(
  taskId: string,
  payload: LessonTaskUpdateInput,
): Promise<LessonTaskDto> {
  return requestJson<LessonTaskDto>(`/api/admin/catalog/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function archiveLessonTask(taskId: string): Promise<void> {
  return requestJson<void>(`/api/admin/catalog/tasks/${taskId}`, {
    method: "DELETE",
  });
}

export function reorderLessonTask(
  lessonId: string,
  taskId: string,
  payload: ReorderInput,
): Promise<void> {
  return requestJson<void>(
    `/api/admin/catalog/lessons/${lessonId}/tasks/${taskId}/reorder`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function duplicateLessonTask(taskId: string): Promise<LessonTaskDto> {
  return requestJson<LessonTaskDto>(
    `/api/admin/catalog/tasks/${taskId}/duplicate`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export function getCourseStructure(courseId: string): Promise<CourseStructure> {
  return requestJson<CourseStructure>(
    `/api/admin/catalog/courses/${courseId}/structure`,
    { method: "GET" },
  );
}

export function validateCourse(courseId: string): Promise<ValidationResult> {
  return requestJson<ValidationResult>(
    `/api/admin/catalog/courses/${courseId}/validate`,
    { method: "POST" },
  );
}
