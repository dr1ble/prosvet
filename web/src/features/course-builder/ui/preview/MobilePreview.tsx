import { useState } from "react";
import { Smartphone, Monitor, ChevronLeft, ChevronRight } from "lucide-react";

import type { BuilderCourse, BuilderTask } from "../../types";
import { TASK_TYPE_LABELS } from "../../types";

import styles from "./MobilePreview.module.css";

interface MobilePreviewProps {
  course: BuilderCourse;
}

export function MobilePreview({ course }: MobilePreviewProps) {
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"mobile" | "desktop">("mobile");

  const lesson = course.lessons[currentLessonIndex];
  const task = lesson?.tasks[currentTaskIndex];

  if (!lesson || !task) {
    return (
      <div className={styles.empty}>
        <p>Нет контента для предпросмотра</p>
      </div>
    );
  }

  const totalTasks = course.lessons.reduce((sum, l) => sum + l.tasks.length, 0);
  const currentGlobalIndex =
    course.lessons
      .slice(0, currentLessonIndex)
      .reduce((sum, l) => sum + l.tasks.length, 0) + currentTaskIndex;

  function goNext() {
    if (currentTaskIndex < lesson.tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    } else if (currentLessonIndex < course.lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
      setCurrentTaskIndex(0);
    }
  }

  function goPrev() {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(currentTaskIndex - 1);
    } else if (currentLessonIndex > 0) {
      const prevLesson = course.lessons[currentLessonIndex - 1];
      setCurrentLessonIndex(currentLessonIndex - 1);
      setCurrentTaskIndex(prevLesson.tasks.length - 1);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === "mobile" ? styles.viewBtnActive : ""}`}
            onClick={() => setViewMode("mobile")}
          >
            <Smartphone size={16} />
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === "desktop" ? styles.viewBtnActive : ""}`}
            onClick={() => setViewMode("desktop")}
          >
            <Monitor size={16} />
          </button>
        </div>

        <div className={styles.progress}>
          <span>
            {currentGlobalIndex + 1} / {totalTasks}
          </span>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${((currentGlobalIndex + 1) / totalTasks) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className={styles.previewArea}>
        <div
          className={`${styles.frame} ${viewMode === "desktop" ? styles.frameDesktop : styles.frameMobile}`}
        >
          <div className={styles.frameHeader}>
            <span className={styles.lessonTitle}>{lesson.title}</span>
            <span className={styles.taskType}>
              {TASK_TYPE_LABELS[task.taskType]}
            </span>
          </div>

          <div className={styles.frameBody}>
            <TaskRenderer task={task} />
          </div>

          <div className={styles.frameFooter}>
            <button
              className={styles.navBtn}
              onClick={goPrev}
              disabled={currentLessonIndex === 0 && currentTaskIndex === 0}
            >
              <ChevronLeft size={20} />
            </button>
            <span className={styles.navLabel}>
              {currentTaskIndex + 1} / {lesson.tasks.length}
            </span>
            <button
              className={styles.navBtn}
              onClick={goNext}
              disabled={
                currentLessonIndex === course.lessons.length - 1 &&
                currentTaskIndex === lesson.tasks.length - 1
              }
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className={styles.lessonNav}>
        {course.lessons.map((l, i) => (
          <button
            key={i}
            className={`${styles.lessonNavBtn} ${i === currentLessonIndex ? styles.lessonNavActive : ""}`}
            onClick={() => {
              setCurrentLessonIndex(i);
              setCurrentTaskIndex(0);
            }}
          >
            {l.title}
            <span className={styles.lessonTaskCount}>{l.tasks.length}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TaskRenderer({ task }: { task: BuilderTask }) {
  switch (task.taskType) {
    case "theory_text":
      return (
        <div
          className={styles.textContent}
          dangerouslySetInnerHTML={{
            __html:
              (task.payload.content as string) || "<p>Нет содержимого</p>",
          }}
        />
      );

    case "theory_video":
      return (
        <div className={styles.videoContent}>
          <VideoPreview url={(task.payload.video_url as string) || ""} />
          {(task.payload.transcript as string) && (
            <div
              className={styles.transcript}
              dangerouslySetInnerHTML={{
                __html: task.payload.transcript as string,
              }}
            />
          )}
        </div>
      );

    case "quiz":
      return (
        <QuizPreview
          questions={
            (task.payload as { questions?: unknown[] }).questions || []
          }
        />
      );

    case "simulation":
      return (
        <div className={styles.simulationContent}>
          <p>
            Симуляция:{" "}
            {(task.payload as { config?: { library_item_id?: string } })?.config
              ?.library_item_id || "не выбрана"}
          </p>
          <span className={styles.note}>
            В мобильном приложении откроется интерактивная симуляция
          </span>
        </div>
      );

    case "cheat_sheet":
      return (
        <div
          className={styles.cheatSheetContent}
          dangerouslySetInnerHTML={{
            __html:
              (task.payload.content as string) || "<p>Нет содержимого</p>",
          }}
        />
      );

    default:
      return <p>Неизвестный тип задачи</p>;
  }
}

function VideoPreview({ url }: { url: string }) {
  if (!url) {
    return <div className={styles.videoPlaceholder}>Видео не указано</div>;
  }

  const embedUrl = getEmbedUrl(url);
  if (embedUrl) {
    return (
      <div className={styles.embedWrapper}>
        <iframe src={embedUrl} allowFullScreen className={styles.embedFrame} />
      </div>
    );
  }

  if (url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
    return <video src={url} controls className={styles.videoPlayer} />;
  }

  return <div className={styles.videoPlaceholder}>Видео: {url}</div>;
}

interface QuizQuestion {
  question?: string;
  type?: string;
  pairs?: Array<{ left: string; right: string }>;
  options?: Array<{ correct?: boolean; text?: string }>;
}

function QuizPreview({ questions }: { questions: QuizQuestion[] }) {
  if (!questions.length) {
    return <div className={styles.quizEmpty}>Нет вопросов</div>;
  }

  return (
    <div className={styles.quizContent}>
      {questions.map((q, i) => (
        <div key={i} className={styles.quizQuestion}>
          <p className={styles.questionText}>
            {q.question || `Вопрос ${i + 1}`}
          </p>
          {q.type === "matching" ? (
            <div className={styles.matchingPreview}>
              {(q.pairs || []).map((pair, j) => (
                <div key={j} className={styles.matchingPair}>
                  <span>{pair.left}</span>
                  <span>→</span>
                  <span>{pair.right}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.optionsPreview}>
              {(q.options || []).map((opt, j) => (
                <div
                  key={j}
                  className={`${styles.option} ${opt.correct ? styles.correctOption : ""}`}
                >
                  <span className={styles.optionMarker}>
                    {opt.correct ? "✓" : "○"}
                  </span>
                  <span>{opt.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null;

  const youtubeMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;

  const rutubeMatch = url.match(/rutube\.ru\/video\/([a-f0-9]+)/);
  if (rutubeMatch) return `https://rutube.ru/play/embed/${rutubeMatch[1]}`;

  const vkMatch = url.match(/vk\.com\/video(-?\d+_\d+)/);
  if (vkMatch) {
    const [oid, id] = vkMatch[1].split("_");
    return `https://vk.com/video_ext.php?oid=${oid}&id=${id}`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return null;
}
