import { useRef, useState } from "react";

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
          <VideoSourceSelector
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

function VideoSourceSelector({
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
  const sourceType = (task.payload.video_source as string) || "url";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    (task.payload.video_local_url as string) || null,
  );

  function handleSourceChange(type: string) {
    onUpdate(lessonId, task.id!, {
      payload: { ...task.payload, video_source: type },
    });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onUpdate(lessonId, task.id!, {
      payload: {
        ...task.payload,
        video_source: "local",
        video_url: "",
        video_local_name: file.name,
        video_local_size: file.size,
        video_local_type: file.type,
        video_local_url: url,
      },
    });
  }

  function handleUrlChange(value: string) {
    onUpdate(lessonId, task.id!, {
      payload: { ...task.payload, video_url: value },
    });
  }

  const embedUrl =
    sourceType === "url"
      ? getVideoEmbedUrl((task.payload.video_url as string) || "")
      : null;
  const localUrl = sourceType === "local" ? previewUrl : null;
  const isDirectVideo = embedUrl?.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
  const isVkVideo = embedUrl?.includes("vk.com/video_ext.php");
  const isTelegram =
    embedUrl?.includes("t.me/") && embedUrl?.includes("embed=1");
  const isYandex = embedUrl?.includes("yandex.ru/video/preview/");
  const hasPreview = embedUrl || localUrl;

  return (
    <div className={styles.field}>
      <label>Видео</label>

      <div className={styles.sourceTabs}>
        <button
          className={`${styles.sourceTab} ${sourceType === "url" ? styles.sourceTabActive : ""}`}
          onClick={() => handleSourceChange("url")}
        >
          По ссылке
        </button>
        <button
          className={`${styles.sourceTab} ${sourceType === "local" ? styles.sourceTabActive : ""}`}
          onClick={() => handleSourceChange("local")}
        >
          Загрузить файл
        </button>
      </div>

      {sourceType === "url" && (
        <div className={styles.urlInputRow}>
          <input
            className={styles.input}
            value={(task.payload.video_url as string) || ""}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://youtube.com/... или https://rutube.ru/video/..."
          />
          {(task.payload.video_url as string) && (
            <span className={styles.sourceHint}>
              {getSourceLabel(task.payload.video_url as string)}
            </span>
          )}
        </div>
      )}

      {sourceType === "local" && (
        <div className={styles.localUpload}>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className={styles.fileInputHidden}
          />
          <button
            className={styles.uploadBtn}
            onClick={() => fileInputRef.current?.click()}
          >
            {task.payload.video_local_name ? (
              <span>
                📎 {task.payload.video_local_name as string}{" "}
                <span className={styles.fileSize}>
                  ({formatFileSize(task.payload.video_local_size as number)})
                </span>
              </span>
            ) : (
              <span>Выбрать видео файл</span>
            )}
          </button>
          <span className={styles.sourceHint}>
            MP4, WebM, Ogg. Файл хранится локально в браузере.
          </span>
        </div>
      )}

      {hasPreview && (
        <div className={styles.videoPreview}>
          {embedUrl && isDirectVideo && (
            <video src={embedUrl} controls className={styles.localVideo} />
          )}
          {embedUrl && !isDirectVideo && (
            <div className={styles.embedWrapper}>
              <iframe
                src={embedUrl}
                title="Video preview"
                allowFullScreen
                className={styles.embedFrame}
                sandbox={
                  isTelegram ? "allow-scripts allow-same-origin" : undefined
                }
              />
            </div>
          )}
          {localUrl && (
            <video src={localUrl} controls className={styles.localVideo} />
          )}
          {embedUrl &&
            !getVideoEmbedUrl((task.payload.video_url as string) || "") && (
              <div className={styles.noEmbed}>
                <p>
                  Предпросмотр недоступен для этого источника. Проверьте ссылку
                  вручную.
                </p>
              </div>
            )}
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

  const youtubeShort = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (youtubeShort) {
    return `https://www.youtube.com/embed/${youtubeShort[1]}`;
  }

  const rutubeMatch = url.match(/rutube\.ru\/video\/([a-f0-9]{32})/);
  if (rutubeMatch) {
    return `https://rutube.ru/play/embed/${rutubeMatch[1]}`;
  }

  const rutubeShort = url.match(/rutube\.ru\/video\/([a-f0-9]+)/);
  if (rutubeShort) {
    return `https://rutube.ru/play/embed/${rutubeShort[1]}`;
  }

  const vkMatch =
    url.match(/vk\.com\/video(-?\d+_\d+)/) ||
    url.match(/vk\.com\/.*\?z=video(-?\d+_\d+)/);
  if (vkMatch) {
    const videoId = vkMatch[1];
    const [oid, id] = videoId.split("_");
    return `https://vk.com/video_ext.php?oid=${oid}&id=${id}&hd=2`;
  }

  const vkShortMatch = url.match(/vkvideo\.ru\/video(-?\d+_\d+)/);
  if (vkShortMatch) {
    const videoId = vkShortMatch[1];
    const [oid, id] = videoId.split("_");
    return `https://vk.com/video_ext.php?oid=${oid}&id=${id}&hd=2`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  const dailymotionMatch = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if (dailymotionMatch) {
    return `https://www.dailymotion.com/embed/video/${dailymotionMatch[1]}`;
  }

  const telegramMatch = url.match(/t\.me\/(\w+)\/(\d+)/);
  if (telegramMatch) {
    return `https://t.me/${telegramMatch[1]}/${telegramMatch[2]}?embed=1`;
  }

  const yandexMatch =
    url.match(/yadi\.sk\/i\/([a-zA-Z0-9_-]+)/) ||
    url.match(/disk\.yandex\.\w+\/i\/([a-zA-Z0-9_-]+)/);
  if (yandexMatch) {
    return `https://yandex.ru/video/preview/${yandexMatch[1]}`;
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

function formatFileSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
