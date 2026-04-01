import {
  BookOpen,
  Eye,
  Save,
  Upload,
  Edit2,
  Undo2,
  Redo2,
  ImagePlus,
  ImageOff,
} from "lucide-react";
import { useRef, useState } from "react";

import { useCourseBuilderStore } from "../store";

import styles from "./CourseBuilderHeader.module.css";

export function CourseBuilderHeader() {
  const course = useCourseBuilderStore((s) => s.course);
  const isDirty = useCourseBuilderStore((s) => s.isDirty);
  const isSaving = useCourseBuilderStore((s) => s.isSaving);
  const lastSavedAt = useCourseBuilderStore((s) => s.lastSavedAt);
  const previewOpen = useCourseBuilderStore((s) => s.previewOpen);
  const canUndo = useCourseBuilderStore((s) => s.canUndo);
  const canRedo = useCourseBuilderStore((s) => s.canRedo);
  const save = useCourseBuilderStore((s) => s.save);
  const undo = useCourseBuilderStore((s) => s.undo);
  const redo = useCourseBuilderStore((s) => s.redo);
  const togglePreview = useCourseBuilderStore((s) => s.togglePreview);
  const updateCourseMeta = useCourseBuilderStore((s) => s.updateCourseMeta);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(course?.title || "");
  const [coverBusy, setCoverBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleTitleSubmit() {
    if (course && titleDraft.trim() && titleDraft !== course.title) {
      updateCourseMeta({ title: titleDraft.trim() });
    } else {
      setTitleDraft(course?.title || "");
    }
    setEditingTitle(false);
  }

  async function handleCoverUpload(file: File) {
    if (!course) return;
    setCoverBusy(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      const { uploadCourseCover } = await import("../api");
      await uploadCourseCover(course.id, file.name, base64);
    } finally {
      setCoverBusy(false);
    }
  }

  async function handleCoverRemove() {
    if (!course) return;
    setCoverBusy(true);
    try {
      const { removeCourseCover } = await import("../api");
      await removeCourseCover(course.id);
    } finally {
      setCoverBusy(false);
    }
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
          onClick={() => undo()}
          disabled={!canUndo}
        >
          <Undo2 size={16} />
          Отменить
        </button>

        <button
          className={styles.btn}
          onClick={() => redo()}
          disabled={!canRedo}
        >
          <Redo2 size={16} />
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
          <ImagePlus size={16} />
          Обложка
        </button>

        <button
          className={styles.btn}
          onClick={() => void handleCoverRemove()}
          disabled={coverBusy || !course}
        >
          <ImageOff size={16} />
          Убрать
        </button>

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
