import { BookOpen, Eye, Save, Upload, X } from "lucide-react";

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

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <BookOpen size={20} />
        <h1 className={styles.title}>{course?.title || "Загрузка..."}</h1>
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
