import { useCallback, useEffect, useState } from "react";

import type { BuilderCourse, ValidationError } from "../../types";

import styles from "./PublishDialog.module.css";

interface PublishDialogProps {
  course: BuilderCourse;
  onPublish: (version: string, changelog: string) => Promise<void>;
  onRollback: (
    releaseId: string,
    version: string,
    changelog?: string,
  ) => Promise<void>;
  onNavigateToIssue: (lessonId?: string, taskId?: string) => void;
  onClose: () => void;
}

function parseVersion(value: string): [number, number, number] | null {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const major = Number(parts[0]);
  const minor = Number(parts[1]);
  const patch = Number(parts[2]);
  if ([major, minor, patch].some((item) => Number.isNaN(item))) return null;
  return [major, minor, patch];
}

function compareVersions(
  a: [number, number, number],
  b: [number, number, number],
): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

function buildNextVersion(versions: string[]): string {
  const parsed = versions
    .map((item) => parseVersion(item))
    .filter((item): item is [number, number, number] => item !== null);
  if (parsed.length === 0) return "1.0.0";
  const latest = parsed.sort(compareVersions)[parsed.length - 1];
  return `${latest[0]}.${latest[1]}.${latest[2] + 1}`;
}

export function PublishDialog({
  course,
  onPublish,
  onRollback,
  onNavigateToIssue,
  onClose,
}: PublishDialogProps) {
  const [version, setVersion] = useState("1.0.0");
  const [changelog, setChangelog] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<ValidationError[]>([]);
  const [validated, setValidated] = useState(false);
  const [releases, setReleases] = useState<
    Array<{ id: string; version: string }>
  >([]);
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  const loadNextVersion = useCallback(async (): Promise<string> => {
    const response = await fetch(
      `/api/admin/catalog/courses/${course.id}/releases`,
    );
    if (!response.ok) {
      throw new Error("Не удалось получить список версий курса");
    }
    const data = await response.json();
    const loadedReleases: Array<{ id: string; version: string }> =
      data.items || data || [];
    setReleases(loadedReleases);
    return buildNextVersion(loadedReleases.map((item) => item.version));
  }, [course.id]);

  const runValidation = useCallback(() => {
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
          message: `Урок "${lesson.title}" не содержит блоков`,
          lessonId: lesson.id || undefined,
          lessonTitle: lesson.title,
        });
      }

      lesson.tasks.forEach((task) => {
        if (!task.title.trim()) {
          foundWarnings.push({
            type: "empty_task_title",
            message: `Блок без названия в уроке "${lesson.title}"`,
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
            message: `Текстовый блок "${task.title || "без названия"}" пуст`,
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
            message: `Видео-блок "${task.title || "без названия"}" не имеет URL`,
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
  }, [course]);

  useEffect(() => {
    async function loadLatestVersion() {
      try {
        const nextVersion = await loadNextVersion();
        setVersion(nextVersion);
      } catch {
        // fallback to 1.0.0
        setVersion("1.0.0");
      }
    }
    loadLatestVersion();
  }, [loadNextVersion]);

  useEffect(() => {
    runValidation();
  }, [runValidation]);

  async function handlePublish() {
    if (errors.length > 0) return;
    setPublishing(true);
    try {
      await onPublish(version, changelog);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка публикации";
      if (
        message.toLowerCase().includes("already exists") ||
        message.toLowerCase().includes("version") ||
        message.includes("409")
      ) {
        try {
          const nextVersion = await loadNextVersion();
          if (nextVersion !== version) {
            setVersion(nextVersion);
            await onPublish(nextVersion, changelog);
            onClose();
            return;
          }
        } catch {
          // keep original publish error below
        }
      }
      setErrors([
        {
          type: "publish_error",
          message,
        },
      ]);
    } finally {
      setPublishing(false);
    }
  }

  async function handleRollback(releaseId: string, sourceVersion: string) {
    if (!version.trim()) return;
    setRollingBack(releaseId);
    try {
      const rollbackChangelog =
        changelog.trim() || `Возврат к версии ${sourceVersion}`;
      await onRollback(releaseId, version, rollbackChangelog);
      onClose();
    } catch (err) {
      setErrors([
        {
          type: "rollback_error",
          message: err instanceof Error ? err.message : "Ошибка возврата",
        },
      ]);
    } finally {
      setRollingBack(null);
    }
  }

  const canPublish = validated && errors.length === 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Публикация курса</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            Закрыть
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label>Версия</label>
            <div className={styles.versionValue} aria-live="polite">
              {version || "1.0.0"}
            </div>
            <p className={styles.fieldHint}>Версия формируется автоматически</p>
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
            </div>

            {!validated && (
              <p className={styles.validationHint}>
                Выполняется автоматическая проверка...
              </p>
            )}

            {validated && (
              <div className={styles.validationResults}>
                {errors.length === 0 && warnings.length === 0 && (
                  <div className={styles.validationOk}>
                    <span>Все проверки пройдены</span>
                  </div>
                )}

                {errors.length > 0 && (
                  <div className={styles.errorList}>
                    {errors.map((err, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`${styles.errorItem} ${styles.issueLink}`}
                        onClick={() =>
                          onNavigateToIssue(
                            err.lessonId || undefined,
                            err.taskId || undefined,
                          )
                        }
                      >
                        <span>{err.message}</span>
                      </button>
                    ))}
                  </div>
                )}

                {warnings.length > 0 && (
                  <div className={styles.warningList}>
                    {warnings.map((warn, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`${styles.warningItem} ${styles.issueLink}`}
                        onClick={() =>
                          onNavigateToIssue(
                            warn.lessonId || undefined,
                            warn.taskId || undefined,
                          )
                        }
                      >
                        <span>{warn.message}</span>
                      </button>
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
              <span className={styles.summaryLabel}>Блоков:</span>
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

          <div className={styles.validationSection}>
            <div className={styles.validationHeader}>
              <h3>История версий</h3>
            </div>
            {releases.length === 0 ? (
              <p className={styles.validationHint}>
                Пока нет опубликованных версий
              </p>
            ) : (
              <div className={styles.warningList}>
                {releases.map((release) => (
                  <div key={release.id} className={styles.releaseRow}>
                    <span>Версия {release.version}</span>
                    <button
                      className={styles.validateBtn}
                      onClick={() =>
                        handleRollback(release.id, release.version)
                      }
                      disabled={!!rollingBack || !version.trim()}
                    >
                      {rollingBack === release.id ? "Возврат..." : "Вернуть"}
                    </button>
                  </div>
                ))}
              </div>
            )}
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
