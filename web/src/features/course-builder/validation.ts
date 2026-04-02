import type { BuilderLesson, BuilderTask } from "./types";

export function getTaskIssues(task: BuilderTask): string[] {
  const issues: string[] = [];

  if (!task.title.trim()) {
    issues.push("Нет названия блока");
  }

  if (
    (task.taskType === "theory_text" || task.taskType === "cheat_sheet") &&
    !(task.payload.content as string)?.trim()
  ) {
    issues.push("Пустое содержание");
  }

  if (
    task.taskType === "theory_video" &&
    !(task.payload.video_url as string)?.trim()
  ) {
    issues.push("Не указан URL видео");
  }

  if (task.taskType === "quiz") {
    const questions =
      (task.payload as { questions?: unknown[] })?.questions || [];
    if (questions.length === 0) {
      issues.push("Квиз без вопросов");
    }
  }

  if (task.taskType === "simulation") {
    const config = (task.payload as { config?: { library_item_id?: string } })
      ?.config;
    if (!config?.library_item_id) {
      issues.push("Не выбрана симуляция");
    }
  }

  return issues;
}

export function getLessonIssueCount(lesson: BuilderLesson): number {
  if (lesson.tasks.length === 0) {
    return 1;
  }

  return lesson.tasks.reduce(
    (sum, task) => sum + getTaskIssues(task).length,
    0,
  );
}
