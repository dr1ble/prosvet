import type { TaskType } from "@/features/catalog/types";

export type { TaskType };

export type WizardStep = "info" | "lessons" | "modules" | "publish";

export interface WizardLesson {
  localId: string;
  serverId: string | null;
  title: string;
  description: string;
  order: number;
}

export interface WizardModule {
  localId: string;
  serverId: string | null;
  lessonLocalId: string;
  taskType: TaskType;
  title: string;
  order: number;
  payload: Record<string, unknown>;
}

export interface WizardCourseInfo {
  title: string;
  slug: string;
  description: string;
}

export const STEP_ORDER: WizardStep[] = [
  "info",
  "lessons",
  "modules",
  "publish",
];

export const STEP_LABELS: Record<WizardStep, string> = {
  info: "Информация",
  lessons: "Уроки",
  modules: "Модули",
  publish: "Публикация",
};
