export type TaskType =
  | "theory_text"
  | "theory_video"
  | "quiz"
  | "simulation"
  | "cheat_sheet";

export interface BuilderTask {
  id: string | null;
  taskType: TaskType;
  title: string;
  orderIndex: number;
  required: boolean;
  payload: Record<string, unknown>;
}

export interface BuilderLesson {
  id: string | null;
  title: string;
  description: string | null;
  orderIndex: number;
  tasks: BuilderTask[];
}

export interface BuilderCourse {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "active" | "archived";
  lessons: BuilderLesson[];
}

export type CourseType = "foundation" | "practice" | "additional";

export interface Competency {
  key: string;
  title: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
}

export interface CourseCompetencyLink {
  competencyKey: string;
  competencyTitle: string;
  competencyDescription: string | null;
  competencyCategory: string | null;
  courseType: CourseType;
}

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  foundation: "Базовый",
  practice: "Практический",
  additional: "Дополнительный",
};

export interface ValidationError {
  type: string;
  message: string;
  lessonId?: string;
  lessonTitle?: string;
  taskId?: string;
  taskTitle?: string;
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  theory_text: "Текст",
  theory_video: "Видео",
  quiz: "Квиз",
  simulation: "Симуляция",
  cheat_sheet: "Памятка",
};

export function defaultPayload(taskType: TaskType): Record<string, unknown> {
  switch (taskType) {
    case "theory_text":
      return { content: "" };
    case "theory_video":
      return { video_url: "", duration_sec: 0, transcript: "" };
    case "quiz":
      return { questions: [] };
    case "simulation":
      return { config: {} };
    case "cheat_sheet":
      return { content: "" };
  }
}
