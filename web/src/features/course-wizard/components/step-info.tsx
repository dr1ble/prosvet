"use client";

import { useState } from "react";

import { useWizardStore } from "../store";
import * as api from "../api";
import styles from "./step-info.module.css";

type StepInfoProps = {
  courseId: string | null;
  onNext: () => void;
  onSave: () => void;
};

function transliterate(text: string): string {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "yo",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "kh",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "shch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };
  return text
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function StepInfo({ courseId, onNext, onSave }: StepInfoProps) {
  const info = useWizardStore((s) => s.info);
  const setInfo = useWizardStore((s) => s.setInfo);
  const setCourseId = useWizardStore((s) => s.setCourseId);
  const setSaving = useWizardStore((s) => s.setSaving);
  const setError = useWizardStore((s) => s.setError);

  const [title, setTitle] = useState(info.title);
  const [desc, setDesc] = useState(info.description);
  const [touched, setTouched] = useState(false);

  const normalizedTitle = title.trim();
  const titleValid = normalizedTitle.length >= 3;
  const normalizedSlug = transliterate(normalizedTitle);
  const slugValid = normalizedSlug.length >= 3;
  const canProceed = titleValid && slugValid;

  const handleSaveAndNext = async () => {
    setTouched(true);
    if (!canProceed) return;

    const slug = normalizedSlug;
    setInfo({ title: normalizedTitle, description: desc, slug });
    try {
      setSaving(true);
      setError(null);
      if (!courseId || courseId === "new") {
        const course = await api.createCourse({
          title: normalizedTitle,
          slug,
          description: desc || undefined,
          status: "draft",
        });
        setCourseId(course.id);
      } else {
        await api.updateCourse(courseId, {
          title: normalizedTitle,
          description: desc || undefined,
        });
      }
      onSave();
      onNext();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось сохранить курс",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.card}>
      <header className={styles.cardHeader}>
        <p className={styles.kicker}>Шаг 1 из 4</p>
        <h2 className={styles.cardTitle}>Информация о курсе</h2>
        <p className={styles.cardSubtitle}>
          Укажите название и описание курса.
        </p>
      </header>

      <div className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>Название *</span>
          <input
            className={`${styles.input} ${touched && (!titleValid || !slugValid) ? styles.inputError : ""}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Например: Основы цифровой грамотности"
          />
          {touched && !titleValid && (
            <span className={styles.fieldHint}>Минимум 3 символа</span>
          )}
          {touched && titleValid && !slugValid && (
            <span className={styles.fieldHint}>
              Название должно давать slug минимум из 3 латинских символов или цифр
            </span>
          )}
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Описание</span>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Краткое описание курса..."
            rows={4}
          />
        </label>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.buttonPrimary}
          onClick={handleSaveAndNext}
          disabled={!canProceed}
        >
          {courseId && courseId !== "new"
            ? "Сохранить и далее →"
            : "Создать курс и далее →"}
        </button>
      </div>
    </div>
  );
}
