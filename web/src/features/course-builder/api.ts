import type { BuilderCourse, BuilderTask, ValidationError } from "./types";

const ADMIN_PROXY = "/api/admin";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${ADMIN_PROXY}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(
      `Request failed (${response.status}): ${payload || response.statusText}`,
    );
  }

  const text = await response.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

export async function createCourse(data: {
  title: string;
  slug?: string;
  description?: string;
  status?: string;
}): Promise<{ id: string; title: string; slug: string }> {
  return fetchJson("/catalog/courses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchCourseStructure(
  courseId: string,
): Promise<BuilderCourse> {
  const data = await fetchJson<{
    course_id: string;
    course_title: string;
    course_description?: string | null;
    lessons: Array<{
      id: string;
      title: string;
      description: string | null;
      order_index: number;
      tasks: Array<{
        id: string;
        task_type: string;
        title: string;
        order_index: number;
        required: boolean;
        payload: Record<string, unknown>;
      }>;
    }>;
  }>(`/catalog/courses/${courseId}/structure`);

  return {
    id: data.course_id,
    title: data.course_title,
    description: data.course_description ?? null,
    status: "draft",
    lessons: data.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      orderIndex: l.order_index,
      tasks: l.tasks.map((t) => ({
        id: t.id,
        taskType: t.task_type as BuilderTask["taskType"],
        title: t.title,
        orderIndex: t.order_index,
        required: t.required,
        payload: t.payload,
      })),
    })),
  };
}

export async function bulkUpdateStructure(
  courseId: string,
  lessons: Array<{
    id: string | null;
    title: string;
    description: string | null;
    order_index: number;
    tasks: Array<{
      id: string | null;
      task_type: string;
      title: string;
      order_index: number;
      required: boolean;
      payload: Record<string, unknown>;
    }>;
  }>,
): Promise<BuilderCourse> {
  const data = await fetchJson<{
    course_id: string;
    course_title: string;
    course_description?: string | null;
    status: string;
    lessons: Array<{
      id: string;
      title: string;
      description: string | null;
      order_index: number;
      tasks: Array<{
        id: string;
        task_type: string;
        title: string;
        order_index: number;
        required: boolean;
        payload: Record<string, unknown>;
      }>;
    }>;
  }>(`/catalog/courses/${courseId}/structure/bulk`, {
    method: "POST",
    body: JSON.stringify({ lessons }),
  });

  return {
    id: data.course_id,
    title: data.course_title,
    description: data.course_description ?? null,
    status: data.status as BuilderCourse["status"],
    lessons: data.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      orderIndex: l.order_index,
      tasks: l.tasks.map((t) => ({
        id: t.id,
        taskType: t.task_type as BuilderTask["taskType"],
        title: t.title,
        orderIndex: t.order_index,
        required: t.required,
        payload: t.payload,
      })),
    })),
  };
}

export async function patchCourseMeta(
  courseId: string,
  patch: { title?: string; description?: string | null },
): Promise<{ id: string; title: string; description: string | null }> {
  return fetchJson(`/catalog/courses/${courseId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function validateCourse(courseId: string): Promise<{
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}> {
  return fetchJson(`/catalog/courses/${courseId}/validate`, {
    method: "POST",
  });
}

export async function publishCourse(
  courseId: string,
  version: string,
  changelog?: string,
): Promise<{ id: string; version: string }> {
  return fetchJson(`/catalog/courses/${courseId}/publish`, {
    method: "POST",
    body: JSON.stringify({ version, changelog }),
  });
}

export async function listCourseReleases(
  courseId: string,
): Promise<
  Array<{ id: string; version: string; created_at: string; status: string }>
> {
  return fetchJson(`/catalog/courses/${courseId}/releases`, {
    method: "GET",
  });
}

export async function rollbackCourse(
  courseId: string,
  releaseId: string,
  version: string,
  changelog?: string,
): Promise<{ id: string; version: string }> {
  return fetchJson(`/catalog/courses/${courseId}/rollback`, {
    method: "POST",
    body: JSON.stringify({
      release_id: releaseId,
      version,
      changelog,
    }),
  });
}

export async function uploadCourseCover(
  courseId: string,
  filename: string,
  contentBase64: string,
): Promise<{ cover_url?: string | null }> {
  return fetchJson(`/catalog/courses/${courseId}/cover`, {
    method: "POST",
    body: JSON.stringify({
      filename,
      content_base64: contentBase64,
    }),
  });
}

export async function removeCourseCover(
  courseId: string,
): Promise<{ cover_url?: string | null }> {
  return fetchJson(`/catalog/courses/${courseId}/cover`, {
    method: "DELETE",
  });
}

export async function duplicateTask(taskId: string): Promise<{
  id: string;
  lesson_id: string;
  task_type: string;
  title: string;
  order_index: number;
  required: boolean;
  payload: Record<string, unknown>;
}> {
  return fetchJson(`/catalog/tasks/${taskId}/duplicate`, {
    method: "POST",
  });
}
