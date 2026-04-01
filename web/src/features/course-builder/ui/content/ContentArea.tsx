import { useState } from "react";

import { useCourseBuilderStore } from "../../store";
import { TASK_TYPE_LABELS } from "../../types";
import { RichTextEditor } from "./RichTextEditor";
import { QuizTaskEditor } from "./QuizTaskEditor";
import { SimulationTaskEditor } from "./SimulationTaskEditor";

import styles from "./ContentArea.module.css";

export function ContentArea() {
  const course = useCourseBuilderStore((s) => s.course);
  const selectedTaskId = useCourseBuilderStore((s) => s.selectedTaskId);
  const selectedLessonId = useCourseBuilderStore((s) => s.selectedLessonId);

  if (!course) {
    return <div className={styles.empty}>Загрузка курса...</div>;
  }

  if (course.lessons.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Курс пустой. Добавьте первый урок в панели слева.</p>
      </div>
    );
  }

  const selectedLesson = course.lessons.find(
    (l) => l.id === selectedLessonId || `${l.id}` === `${selectedLessonId}`,
  );

  const selectedTask = selectedLesson?.tasks.find(
    (t) => t.id === selectedTaskId || `${t.id}` === `${selectedTaskId}`,
  );

  if (!selectedTask) {
    return (
      <div className={styles.empty}>
        <p>Выберите задачу для редактирования</p>
      </div>
    );
  }

  return (
    <div className={styles.editor}>
      <div className={styles.breadcrumb}>
        {selectedLesson?.title} → {TASK_TYPE_LABELS[selectedTask.taskType]}
      </div>

      <div className={styles.editorBody}>
        <TaskEditor task={selectedTask} lessonId={selectedLesson!.id!} />
      </div>
    </div>
  );
}

function TaskEditor({
  task,
  lessonId,
}: {
  task: {
    id: string | null;
    taskType: string;
    title: string;
    payload: Record<string, unknown>;
  };
  lessonId: string;
}) {
  const updateTask = useCourseBuilderStore((s) => s.updateTask);

  switch (task.taskType) {
    case "theory_text":
      return (
        <div className={styles.textField}>
          <label>Содержание урока</label>
          <RichTextEditor
            value={(task.payload.content as string) || ""}
            onChange={(html) =>
              updateTask(lessonId, task.id!, {
                payload: { ...task.payload, content: html },
              })
            }
            placeholder="Начните вводить текст урока..."
          />
        </div>
      );

    case "theory_video":
      return (
        <div className={styles.form}>
          <VideoUrlEditor
            task={task}
            lessonId={lessonId}
            onUpdate={updateTask}
          />
          <div className={styles.field}>
            <label>Транскрипт</label>
            <RichTextEditor
              value={(task.payload.transcript as string) || ""}
              onChange={(html) =>
                updateTask(lessonId, task.id!, {
                  payload: { ...task.payload, transcript: html },
                })
              }
              placeholder="Текст транскрипта..."
            />
          </div>
        </div>
      );

    case "cheat_sheet":
      return (
        <div className={styles.textField}>
          <label>Содержание шпаргалки</label>
          <RichTextEditor
            value={(task.payload.content as string) || ""}
            onChange={(html) =>
              updateTask(lessonId, task.id!, {
                payload: { ...task.payload, content: html },
              })
            }
            placeholder="Текст шпаргалки..."
          />
        </div>
      );

    case "quiz":
      return (
        <div className={styles.textField}>
          <QuizTaskEditor
            value={
              task.payload as {
                questions?: {
                  type: "single_choice" | "multiple_choice" | "matching";
                  question: string;
                  options: { text: string; correct: boolean }[];
                  pairs?: { left: string; right: string }[];
                }[];
              }
            }
            onChange={(val) =>
              updateTask(lessonId, task.id!, {
                payload: val as Record<string, unknown>,
              })
            }
          />
        </div>
      );

    case "simulation":
      return (
        <div className={styles.textField}>
          <SimulationTaskEditor
            value={
              task.payload as {
                config?: { library_item_id?: string; simulation_id?: string };
              }
            }
            onChange={(val) =>
              updateTask(lessonId, task.id!, {
                payload: val as Record<string, unknown>,
              })
            }
          />
        </div>
      );

    default:
      return <div className={styles.placeholder}>Неизвестный тип задачи</div>;
  }
}

function VideoUrlEditor({
  task,
  lessonId,
  onUpdate,
}: {
  task: { id: string | null; payload: Record<string, unknown> };
  lessonId: string;
  onUpdate: (
    lessonId: string,
    taskId: string,
    patch: Record<string, unknown>,
  ) => void;
}) {
  const url = (task.payload.video_url as string) || "";
  const embedUrl = getVideoEmbedUrl(url);
  const isDirectVideo = url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
  const sourceLabel = getSourceLabel(url);

  return (
    <div className={styles.field}>
      <label>URL видео</label>
      <input
        className={styles.input}
        value={url}
        onChange={(e) =>
          onUpdate(lessonId, task.id!, {
            payload: { ...task.payload, video_url: e.target.value },
          })
        }
        placeholder="https://youtube.com/... или https://rutube.ru/video/..."
      />
      {url && (
        <span className={styles.sourceHint}>
          {sourceLabel || "Неизвестный источник"}
        </span>
      )}

      {embedUrl && !isDirectVideo && (
        <div className={styles.videoPreview}>
          <div className={styles.embedWrapper}>
            <iframe
              src={embedUrl}
              title="Video preview"
              allowFullScreen
              className={styles.embedFrame}
            />
          </div>
        </div>
      )}

      {isDirectVideo && (
        <div className={styles.videoPreview}>
          <video src={url} controls className={styles.localVideo} />
        </div>
      )}

      {url && !embedUrl && !isDirectVideo && (
        <div className={styles.noEmbed}>
          Предпросмотр недоступен для этого источника
        </div>
      )}
    </div>
  );
}

function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;

  const youtubeMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  const rutubeMatch = url.match(/rutube\.ru\/video\/([a-f0-9]+)/);
  if (rutubeMatch) {
    return `https://rutube.ru/play/embed/${rutubeMatch[1]}`;
  }

  const vkMatch =
    url.match(/vk\.com\/video(-?\d+_\d+)/) ||
    url.match(/vk\.com\/.*\?z=video(-?\d+_\d+)/);
  if (vkMatch) {
    const [oid, id] = vkMatch[1].split("_");
    return `https://vk.com/video_ext.php?oid=${oid}&id=${id}&hd=2`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  if (url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
    return url;
  }

  return null;
}

function getSourceLabel(url: string): string {
  if (!url) return "";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
  if (url.includes("rutube.ru")) return "Rutube";
  if (url.includes("vk.com") || url.includes("vkvideo.ru")) return "VK Видео";
  if (url.includes("vimeo.com")) return "Vimeo";
  if (url.includes("dailymotion.com")) return "Dailymotion";
  if (url.includes("t.me/")) return "Telegram";
  if (url.includes("yadi.sk") || url.includes("disk.yandex"))
    return "Яндекс.Диск";
  if (url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i))
    return "Прямая ссылка на видео";
  return "Неизвестный источник";
}
