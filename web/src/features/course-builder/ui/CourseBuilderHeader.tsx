import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { toUserErrorMessage } from "@/shared/lib/api-error";

import { useCourseBuilderStore } from "../store";
import { CourseCompetenciesDialog } from "./competencies/CourseCompetenciesDialog";

import styles from "./CourseBuilderHeader.module.css";

export function CourseBuilderHeader() {
  const router = useRouter();
  const course = useCourseBuilderStore((s) => s.course);
  const isDirty = useCourseBuilderStore((s) => s.isDirty);
  const isSaving = useCourseBuilderStore((s) => s.isSaving);
  const lastSavedAt = useCourseBuilderStore((s) => s.lastSavedAt);
  const canUndo = useCourseBuilderStore((s) => s.canUndo);
  const canRedo = useCourseBuilderStore((s) => s.canRedo);
  const save = useCourseBuilderStore((s) => s.save);
  const undo = useCourseBuilderStore((s) => s.undo);
  const redo = useCourseBuilderStore((s) => s.redo);
  const updateCourseMeta = useCourseBuilderStore((s) => s.updateCourseMeta);

  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [titleDraft, setTitleDraft] = useState(course?.title || "");
  const [descriptionDraft, setDescriptionDraft] = useState(
    course?.description || "",
  );
  const [coverBusy, setCoverBusy] = useState(false);
  const [competenciesOpen, setCompetenciesOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showSaved = Boolean(lastSavedAt && !isDirty);
  const showUnsaved = Boolean(isDirty && !isSaving);
  const showSaving = Boolean(isSaving);

  function handleTitleSubmit() {
    const normalizedTitle = titleDraft.trim();

    if (normalizedTitle.length > 0 && normalizedTitle.length < 3) {
      setSaveError("Название курса должно содержать минимум 3 символа.");
      setEditingTitle(false);
      setTitleDraft(course?.title || "");
      return;
    }

    if (course && normalizedTitle && normalizedTitle !== course.title) {
      setSaveError(null);
      updateCourseMeta({ title: normalizedTitle });
      void (async () => {
        try {
          const { patchCourseMeta } = await import("../api");
          await patchCourseMeta(course.id, { title: normalizedTitle });
        } catch (error) {
          setSaveError(
            toUserErrorMessage(error, "Не удалось сохранить название курса."),
          );
        }
      })();
    } else {
      setTitleDraft(course?.title || "");
    }
    setEditingTitle(false);
  }

  function handleDescriptionSubmit() {
    if (!course) {
      setEditingDescription(false);
      return;
    }

    const nextDescription = descriptionDraft.trim();
    const normalized = nextDescription.length > 0 ? nextDescription : null;
    if ((course.description ?? null) !== normalized) {
      setSaveError(null);
      updateCourseMeta({ description: normalized });
      void (async () => {
        try {
          const { patchCourseMeta } = await import("../api");
          await patchCourseMeta(course.id, { description: normalized });
        } catch (error) {
          setSaveError(
            toUserErrorMessage(error, "Не удалось сохранить описание курса."),
          );
        }
      })();
    } else {
      setDescriptionDraft(course.description || "");
    }
    setEditingDescription(false);
  }

  function cancelDescriptionEdit() {
    setDescriptionDraft(course?.description || "");
    setEditingDescription(false);
  }

  async function handleCoverUpload(file: File) {
    if (!course) return;
    setCoverBusy(true);
    setSaveError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      const { uploadCourseCover } = await import("../api");
      await uploadCourseCover(course.id, file.name, base64);
    } catch (error) {
      setSaveError(
        toUserErrorMessage(error, "Не удалось загрузить обложку курса."),
      );
    } finally {
      setCoverBusy(false);
    }
  }

  async function handleCoverRemove() {
    if (!course) return;
    setCoverBusy(true);
    setSaveError(null);
    try {
      const { removeCourseCover } = await import("../api");
      await removeCourseCover(course.id);
    } catch (error) {
      setSaveError(
        toUserErrorMessage(error, "Не удалось удалить обложку курса."),
      );
    } finally {
      setCoverBusy(false);
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
        <div className={styles.left}>
          <div className={styles.titleRow}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => router.push("/catalog")}
              aria-label="К списку курсов"
              title="К курсам"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                role="presentation"
                aria-hidden="true"
              >
                <path
                  d="M12.8 4.8 7.6 10l5.2 5.2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {editingTitle ? (
              <input
                className={styles.titleEditInput}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSubmit();
                  if (e.key === "Escape") {
                    setTitleDraft(course?.title || "");
                    setEditingTitle(false);
                  }
                }}
                autoFocus
              />
            ) : (
              <h1
                className={styles.title}
                onClick={() => {
                  setEditingTitle(true);
                  setTitleDraft(course?.title || "");
                }}
                title="Нажмите для редактирования"
              >
                {course?.title || "Загрузка..."}
              </h1>
            )}
            {course && (
              <span className={`${styles.badge} ${styles[course.status]}`}>
                {course.status === "draft"
                  ? "Черновик"
                  : course.status === "active"
                    ? "Опубликован"
                    : "Архив"}
              </span>
            )}
          </div>

          {course?.description ? (
            <button
              type="button"
              className={`${styles.descriptionInline} ${styles.descriptionInlineButton}`}
              onClick={() => {
                setEditingDescription(true);
                setDescriptionDraft(course.description || "");
              }}
              title="Нажмите, чтобы отредактировать описание"
            >
              <p className={styles.description}>{course.description}</p>
            </button>
          ) : (
            <button
              type="button"
              className={styles.addDescriptionBtn}
              onClick={() => {
                setEditingDescription(true);
                setDescriptionDraft("");
              }}
            >
              + Добавить описание
            </button>
          )}
        </div>

        <div className={styles.right}>
          {(showSaved || showUnsaved || showSaving) && (
            <div className={styles.stateRow}>
              {showSaved && (
                <span className={styles.savedAt}>
                  Сохранено:{" "}
                  {lastSavedAt?.toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {showUnsaved && (
                <span className={styles.unsaved}>
                  Есть несохранённые изменения
                </span>
              )}
              {showSaving && (
                <span className={styles.saving}>Сохранение...</span>
              )}
            </div>
          )}

          {saveError ? (
            <p className={styles.inlineError} role="alert">
              {saveError}
            </p>
          ) : null}

          <div className={styles.actionsRow}>
            <div className={styles.secondaryActions}>
              <button
                className={styles.btn}
                onClick={() => undo()}
                disabled={!canUndo}
              >
                Отменить
              </button>

              <button
                className={styles.btn}
                onClick={() => redo()}
                disabled={!canRedo}
              >
                Повторить
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleCoverUpload(file);
                  }
                  e.currentTarget.value = "";
                }}
              />

              <button
                className={styles.btn}
                onClick={() => fileInputRef.current?.click()}
                disabled={coverBusy || !course}
              >
                Обложка
              </button>

              <button
                className={styles.btn}
                onClick={() => setCompetenciesOpen(true)}
                disabled={!course}
              >
                Компетенции
              </button>

              <button
                className={styles.btn}
                onClick={() => void handleCoverRemove()}
                disabled={coverBusy || !course}
              >
                Убрать
              </button>
            </div>

            <div className={styles.primaryActions}>
              <button
                className={styles.btn}
                onClick={() => save()}
                disabled={isSaving || !isDirty}
              >
                Сохранить
              </button>
            </div>

            <div className={styles.publishAction}>
              <button
                type="button"
                className={`${styles.btn} ${styles.publish}`}
                onClick={() =>
                  useCourseBuilderStore.getState().openPublishDialog()
                }
              >
                <svg
                  className={styles.publishIcon}
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4.2 10h11.2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M11.2 6.8 15 10l-3.8 3.2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>На проверку</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {editingDescription && (
        <div
          className={styles.descriptionOverlay}
          onClick={cancelDescriptionEdit}
        >
          <div
            className={styles.descriptionDialog}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.descriptionHead}>
              <span className={styles.descriptionLabel}>Описание курса</span>
            </div>
            <textarea
              className={styles.descriptionEditInput}
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  handleDescriptionSubmit();
                }
                if (e.key === "Escape") {
                  cancelDescriptionEdit();
                }
              }}
              placeholder="Добавьте описание курса"
              rows={6}
              autoFocus
            />
            <div className={styles.descriptionDialogActions}>
              <button
                type="button"
                className={styles.btn}
                onClick={cancelDescriptionEdit}
              >
                Отмена
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.publish}`}
                onClick={handleDescriptionSubmit}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {competenciesOpen && course ? (
        <CourseCompetenciesDialog
          courseId={course.id}
          onClose={() => setCompetenciesOpen(false)}
        />
      ) : null}
    </header>
  );
}
