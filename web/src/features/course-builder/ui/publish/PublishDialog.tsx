import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import type { BuilderCourse, ValidationError } from "../../types";

import styles from "./PublishDialog.module.css";

interface PublishDialogProps {
  course: BuilderCourse;
  onPublish: (version: string, changelog: string) => Promise<void>;
  onClose: () => void;
}

export function PublishDialog({
  course,
  onPublish,
  onClose,
}: PublishDialogProps) {
  const [version, setVersion] = useState("1.0.0");
  const [changelog, setChangelog] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<ValidationError[]>([]);
  const [validated, setValidated] = useState(false);
  const [loadingVersion, setLoadingVersion] = useState(true);

  useEffect(() => {
    async function loadLatestVersion() {
      try {
        const response = await fetch(
          `/api/admin/catalog/courses/${course.id}/releases`,
        );
        if (response.ok) {
          const data = await response.json();
          const releases = data.items || data || [];
          if (releases.length > 0) {
            const latest = releases[0].version || "0.0.0";
            const parts = latest.split(".").map(Number);
            parts[2] = (parts[2] || 0) + 1;
            setVersion(parts.join("."));
          }
        }
      } catch {
        // fallback to 1.0.0
      } finally {
        setLoadingVersion(false);
      }
    }
    loadLatestVersion();
  }, [course.id]);

  async function handleValidate() {
    const foundErrors: ValidationError[] = [];
    const foundWarnings: ValidationError[] = [];

    if (course.lessons.length === 0) {
      foundErrors.push({
        type: "no_lessons",
        message: "Курс не содержит уроков",
      });
    }

    course.lessons.forEach((lesson) => {
      if (lesson.tasks.length === 0) {
        foundErrors.push({
          type: "empty_lesson",
          message: `Урок "${lesson.title}" не содержит задач`,
          lessonId: lesson.id || undefined,
          lessonTitle: lesson.title,
        });
      }

      lesson.tasks.forEach((task) => {
        if (!task.title.trim()) {
          foundWarnings.push({
            type: "empty_task_title",
            message: `Задача без названия в уроке "${lesson.title}"`,
            lessonId: lesson.id || undefined,
            taskId: task.id || undefined,
          });
        }

        if (
          task.taskType === "theory_text" &&
          !(task.payload.content as string)?.trim()
        ) {
          foundErrors.push({
            type: "empty_text_content",
            message: `Текстовая задача "${task.title || "без названия"}" пуста`,
            lessonId: lesson.id || undefined,
            taskId: task.id || undefined,
            taskTitle: task.title,
          });
        }

        if (
          task.taskType === "theory_video" &&
          !(task.payload.video_url as string)?.trim()
        ) {
          foundErrors.push({
            type: "empty_video_url",
            message: `Видео задача "${task.title || "без названия"}" не имеет URL`,
            lessonId: lesson.id || undefined,
            taskId: task.id || undefined,
            taskTitle: task.title,
          });
        }

        if (task.taskType === "quiz") {
          const questions =
            (task.payload as { questions?: unknown[] })?.questions || [];
          if (questions.length === 0) {
            foundErrors.push({
              type: "empty_quiz",
              message: `Квиз "${task.title || "без названия"}" не содержит вопросов`,
              lessonId: lesson.id || undefined,
              taskId: task.id || undefined,
              taskTitle: task.title,
            });
          }
        }

        if (task.taskType === "simulation") {
          const config = (
            task.payload as { config?: { library_item_id?: string } }
          )?.config;
          if (!config?.library_item_id) {
            foundErrors.push({
              type: "no_simulation_bound",
              message: `Симуляция "${task.title || "без названия"}" не привязана`,
              lessonId: lesson.id || undefined,
              taskId: task.id || undefined,
              taskTitle: task.title,
            });
          }
        }

        if (
          task.taskType === "cheat_sheet" &&
          !(task.payload.content as string)?.trim()
        ) {
          foundWarnings.push({
            type: "empty_cheat_sheet",
            message: `Шпаргалка "${task.title || "без названия"}" пуста`,
            lessonId: lesson.id || undefined,
            taskId: task.id || undefined,
            taskTitle: task.title,
          });
        }
      });
    });

    setErrors(foundErrors);
    setWarnings(foundWarnings);
    setValidated(true);
  }

  async function handlePublish() {
    if (errors.length > 0) return;
    setPublishing(true);
    try {
      await onPublish(version, changelog);
      onClose();
    } catch (err) {
      setErrors([
        {
          type: "publish_error",
          message: err instanceof Error ? err.message : "Ошибка публикации",
        },
      ]);
    } finally {
      setPublishing(false);
    }
  }

  const canPublish = validated && errors.length === 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Публикация курса</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <XCircle size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label>Версия</label>
            <input
              className={styles.input}
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
            />
          </div>

          <div className={styles.field}>
            <label>Описание изменений</label>
            <textarea
              className={styles.textarea}
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="Что изменилось в этой версии..."
              rows={3}
            />
          </div>

          <div className={styles.validationSection}>
            <div className={styles.validationHeader}>
              <h3>Валидация</h3>
              <button className={styles.validateBtn} onClick={handleValidate}>
                Проверить
              </button>
            </div>

            {!validated && (
              <p className={styles.validationHint}>
                Нажмите &quot;Проверить&quot; для поиска ошибок перед
                публикацией
              </p>
            )}

            {validated && (
              <div className={styles.validationResults}>
                {errors.length === 0 && warnings.length === 0 && (
                  <div className={styles.validationOk}>
                    <CheckCircle size={18} />
                    <span>Все проверки пройдены</span>
                  </div>
                )}

                {errors.length > 0 && (
                  <div className={styles.errorList}>
                    {errors.map((err, i) => (
                      <div key={i} className={styles.errorItem}>
                        <XCircle size={16} className={styles.errorIcon} />
                        <span>{err.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {warnings.length > 0 && (
                  <div className={styles.warningList}>
                    {warnings.map((warn, i) => (
                      <div key={i} className={styles.warningItem}>
                        <AlertTriangle
                          size={16}
                          className={styles.warningIcon}
                        />
                        <span>{warn.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Уроков:</span>
              <span className={styles.summaryValue}>
                {course.lessons.length}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Задач:</span>
              <span className={styles.summaryValue}>
                {course.lessons.reduce((sum, l) => sum + l.tasks.length, 0)}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Ошибок:</span>
              <span
                className={`${styles.summaryValue} ${errors.length > 0 ? styles.summaryError : ""}`}
              >
                {errors.length}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Отмена
          </button>
          <button
            className={styles.publishBtn}
            disabled={!canPublish || publishing}
            onClick={handlePublish}
          >
            {publishing ? "Публикация..." : "Опубликовать"}
          </button>
        </div>
      </div>
    </div>
  );
}
