import { BookOpen, Eye, Save, Upload, X, Edit2 } from "lucide-react";
import { useState } from "react";

import { useCourseBuilderStore } from "../store";

import styles from "./CourseBuilderHeader.module.css";

export function CourseBuilderHeader() {
  const course = useCourseBuilderStore((s) => s.course);
  const isDirty = useCourseBuilderStore((s) => s.isDirty);
  const isSaving = useCourseBuilderStore((s) => s.isSaving);
  const lastSavedAt = useCourseBuilderStore((s) => s.lastSavedAt);
  const previewOpen = useCourseBuilderStore((s) => s.previewOpen);
  const save = useCourseBuilderStore((s) => s.save);
  const togglePreview = useCourseBuilderStore((s) => s.togglePreview);
  const updateCourseMeta = useCourseBuilderStore((s) => s.updateCourseMeta);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(course?.title || "");

  function handleTitleSubmit() {
    if (course && titleDraft.trim() && titleDraft !== course.title) {
      updateCourseMeta({ title: titleDraft.trim() });
    } else {
      setTitleDraft(course?.title || "");
    }
    setEditingTitle(false);
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <BookOpen size={20} />
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
            <Edit2 size={12} className={styles.editIcon} />
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

      <div className={styles.right}>
        {lastSavedAt && !isDirty && (
          <span className={styles.savedAt}>
            Сохранено:{" "}
            {lastSavedAt.toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
        {isDirty && !isSaving && (
          <span className={styles.unsaved}>Есть несохранённые изменения</span>
        )}
        {isSaving && <span className={styles.saving}>Сохранение...</span>}

        <button
          className={styles.btn}
          onClick={() => save()}
          disabled={isSaving || !isDirty}
        >
          <Save size={16} />
          Сохранить
        </button>

        <button
          className={`${styles.btn} ${previewOpen ? styles.btnActive : ""}`}
          onClick={() => togglePreview()}
        >
          <Eye size={16} />
          Превью
        </button>

        <button
          className={`${styles.btn} ${styles.publish}`}
          onClick={() => useCourseBuilderStore.getState().openPublishDialog()}
        >
          <Upload size={16} />
          Опубликовать
        </button>
      </div>
    </header>
  );
}
