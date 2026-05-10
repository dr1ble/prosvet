import type {
  BuilderCourse,
  BuilderTask,
  Competency,
  CourseCompetencyLink,
  CourseType,
  ValidationError,
} from "./types";
import { extractApiErrorMessage } from "@/shared/lib/api-error";

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
      extractApiErrorMessage(
        payload,
        response.status,
        "Failed to process course builder request.",
      ),
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
  return fetchJson(`/catalog/courses/${courseId}/submit_for_review`, {
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

function mapCompetency(data: {
  key: string;
  title: string;
  description?: string | null;
  category?: string | null;
  is_active: boolean;
}): Competency {
  return {
    key: data.key,
    title: data.title,
    description: data.description ?? null,
    category: data.category ?? null,
    isActive: data.is_active,
  };
}

function mapCourseCompetency(data: {
  competency_key: string;
  competency_title: string;
  competency_description?: string | null;
  competency_category?: string | null;
  course_type: string;
}): CourseCompetencyLink {
  return {
    competencyKey: data.competency_key,
    competencyTitle: data.competency_title,
    competencyDescription: data.competency_description ?? null,
    competencyCategory: data.competency_category ?? null,
    courseType: data.course_type as CourseType,
  };
}

export async function listCompetencies(): Promise<Competency[]> {
  const data = await fetchJson<
    Array<{
      key: string;
      title: string;
      description?: string | null;
      category?: string | null;
      is_active: boolean;
    }>
  >("/catalog/competencies");
  return data.map(mapCompetency);
}

export async function createCompetency(data: {
  title: string;
  description?: string | null;
  category?: string | null;
}): Promise<Competency> {
  const competency = await fetchJson<{
    key: string;
    title: string;
    description?: string | null;
    category?: string | null;
    is_active: boolean;
  }>("/catalog/competencies", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return mapCompetency(competency);
}

export async function deactivateCompetency(key: string): Promise<Competency> {
  const competency = await fetchJson<{
    key: string;
    title: string;
    description?: string | null;
    category?: string | null;
    is_active: boolean;
  }>(`/catalog/competencies/${encodeURIComponent(key)}`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: false }),
  });
  return mapCompetency(competency);
}

export async function listCourseCompetencies(
  courseId: string,
): Promise<CourseCompetencyLink[]> {
  const data = await fetchJson<
    Array<{
      competency_key: string;
      competency_title: string;
      competency_description?: string | null;
      competency_category?: string | null;
      course_type: string;
    }>
  >(`/catalog/courses/${courseId}/competencies`);
  return data.map(mapCourseCompetency);
}

export async function saveCourseCompetencies(
  courseId: string,
  items: Array<{ competencyKey: string; courseType: CourseType }>,
): Promise<CourseCompetencyLink[]> {
  const data = await fetchJson<
    Array<{
      competency_key: string;
      competency_title: string;
      competency_description?: string | null;
      competency_category?: string | null;
      course_type: string;
    }>
  >(`/catalog/courses/${courseId}/competencies`, {
    method: "PUT",
    body: JSON.stringify({
      items: items.map((item) => ({
        competency_key: item.competencyKey,
        course_type: item.courseType,
      })),
    }),
  });
  return data.map(mapCourseCompetency);
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
