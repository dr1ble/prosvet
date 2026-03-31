"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useWizardStore } from "../store";
import * as api from "../api";
import styles from "./step-publish.module.css";

interface ValidationDisplay {
  valid: boolean;
  errors: Array<{ message: string }>;
  warnings: Array<{ message: string }>;
}

type StepPublishProps = {
  courseId: string;
  onPrev: () => void;
};

export function StepPublish({ courseId, onPrev }: StepPublishProps) {
  const router = useRouter();
  const lessons = useWizardStore((s) => s.lessons);
  const modules = useWizardStore((s) => s.modules);
  const info = useWizardStore((s) => s.info);
  const setError = useWizardStore((s) => s.setError);
  const reset = useWizardStore((s) => s.reset);

  const [version, setVersion] = useState("1.0.0");
  const [changelog, setChangelog] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ValidationDisplay | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleValidate = async () => {
    setValidating(true);
    try {
      const result = await api.validateCourse(courseId);
      setValidationResult({
        valid: result.valid,
        errors: result.errors.map((e) => ({ message: e.message })),
        warnings: result.warnings.map((w) => ({ message: w.message })),
      });
    } catch (err) {
      setValidationResult({
        valid: false,
        errors: [
          {
            message: err instanceof Error ? err.message : "Проверка не удалась",
          },
        ],
        warnings: [],
      });
    } finally {
      setValidating(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    try {
      await api.publishCourse(courseId, version, changelog || undefined);
      reset();
      router.push(`/catalog?courseId=${courseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Публикация не удалась");
    } finally {
      setPublishing(false);
    }
  };

  const completedModules = modules.filter((m) => m.title.trim()).length;

  if (showPreview) {
    return (
      <div className={styles.card}>
        <header className={styles.cardHeader}>
          <p className={styles.kicker}>Предпросмотр</p>
          <h2 className={styles.cardTitle}>{info.title || "Без названия"}</h2>
          {info.description && (
            <p className={styles.cardSubtitle}>{info.description}</p>
          )}
        </header>

        <div className={styles.previewSection}>
          <h3 className={styles.previewTitle}>Структура курса</h3>
          {lessons
            .sort((a, b) => a.order - b.order)
            .map((lesson) => {
              const lessonModules = modules
                .filter((m) => m.lessonLocalId === lesson.localId)
                .sort((a, b) => a.order - b.order);
              return (
                <div key={lesson.localId} className={styles.previewLesson}>
                  <h4 className={styles.previewLessonTitle}>
                    {lesson.title || "Без названия"}
                  </h4>
                  {lessonModules.length === 0 ? (
                    <p className={styles.previewEmpty}>Нет модулей</p>
                  ) : (
                    <ul className={styles.previewModuleList}>
                      {lessonModules.map((mod) => (
                        <li key={mod.localId} className={styles.previewModule}>
                          <span className={styles.previewModuleType}>
                            {mod.taskType}
                          </span>
                          <span>{mod.title || "Без названия"}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={() => setShowPreview(false)}
          >
            ← Назад к публикации
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <header className={styles.cardHeader}>
        <p className={styles.kicker}>Шаг 4 из 4</p>
        <h2 className={styles.cardTitle}>Публикация курса</h2>
        <p className={styles.cardSubtitle}>
          Проверьте курс, посмотрите превью и опубликуйте.
        </p>
      </header>

      <div className={styles.summary}>
        <h3 className={styles.summaryTitle}>Сводка</h3>
        <div className={styles.summaryRow}>
          <span>Название:</span>
          <strong>{info.title || "—"}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span>Уроков:</span>
          <strong>{lessons.length}</strong>
        </div>
        <div className={styles.summaryRow}>
          <span>Модулей заполнено:</span>
          <strong>
            {completedModules}/{modules.length}
          </strong>
        </div>
      </div>

      <div className={styles.previewBtnRow}>
        <button
          type="button"
          className={styles.previewBtn}
          onClick={() => setShowPreview(true)}
        >
          Предпросмотр курса
        </button>
      </div>

      <div className={styles.validation}>
        <button
          type="button"
          className={styles.validateBtn}
          onClick={handleValidate}
          disabled={validating}
        >
          {validating ? "Проверка..." : "Проверить курс"}
        </button>
        {validationResult && (
          <div
            className={
              validationResult.valid ? styles.validResult : styles.invalidResult
            }
          >
            {validationResult.valid ? (
              <p className={styles.validText}>✓ Курс прошёл проверку!</p>
            ) : (
              <>
                <p className={styles.errorText}>
                  Найдено ошибок: {validationResult.errors.length}
                </p>
                <ul className={styles.errorList}>
                  {validationResult.errors.map((err, i) => (
                    <li key={i}>{err.message}</li>
                  ))}
                </ul>
              </>
            )}
            {validationResult.warnings.length > 0 && (
              <>
                <p className={styles.warningText}>
                  Предупреждений: {validationResult.warnings.length}
                </p>
                <ul className={styles.warningList}>
                  {validationResult.warnings.map((w, i) => (
                    <li key={i}>{w.message}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      <div className={styles.publishForm}>
        <label className={styles.field}>
          <span className={styles.label}>Версия *</span>
          <input
            className={styles.input}
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0.0"
            pattern="^\d+\.\d+\.\d+$"
            required
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Changelog</span>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            placeholder="Что нового..."
            rows={3}
          />
        </label>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={onPrev}
        >
          ← Назад
        </button>
        <button
          type="button"
          className={styles.buttonPublish}
          onClick={handlePublish}
          disabled={
            publishing || (validationResult !== null && !validationResult.valid)
          }
        >
          {publishing ? "Публикация..." : "Опубликовать"}
        </button>
      </div>
    </div>
  );
}
