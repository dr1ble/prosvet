"use client";

import type {
  CourseCreateInput,
  CourseDto,
  CourseReleaseCreateInput,
  CourseReleaseDto,
} from "./types";

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      `Request failed (${response.status}): ${raw || response.statusText}`,
    );
  }

  if (!raw) {
    return {} as T;
  }

  return JSON.parse(raw) as T;
}

export function createCourse(payload: CourseCreateInput): Promise<CourseDto> {
  return postJson<CourseDto>("/api/admin/catalog/courses", payload);
}

export function createCourseRelease(
  courseId: string,
  payload: CourseReleaseCreateInput,
): Promise<CourseReleaseDto> {
  return postJson<CourseReleaseDto>(
    `/api/admin/catalog/courses/${courseId}/releases`,
    payload,
  );
}
