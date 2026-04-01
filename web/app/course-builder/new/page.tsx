"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createCourse } from "@/features/course-builder/api";

import styles from "./page.module.css";

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

export default function CourseBuilderNewPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = title.trim().length >= 2;

  const handleCreate = async () => {
    if (!canCreate || saving) return;
    setSaving(true);
    setError(null);
    try {
      const slug = transliterate(title.trim());
      const course = await createCourse({
        title: title.trim(),
        slug: slug || `course-${Date.now()}`,
        description: description.trim() || undefined,
        status: "draft",
      });
      router.push(`/course-builder/${course.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать курс");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <p className={styles.kicker}>Конструктор</p>
          <h1 className={styles.title}>Новый курс</h1>
          <p className={styles.subtitle}>
            Создайте курс и перейдите к визуальному редактированию структуры,
            уроков и заданий.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.backLink} href="/catalog">
            ← Назад в каталог
          </Link>
        </div>
      </header>

      <section className={styles.formSection}>
        <div className={styles.formCard}>
          <label className={styles.field}>
            <span className={styles.label}>Название *</span>
            <input
              className={styles.input}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Госуслуги для начинающих"
              autoFocus
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Описание</span>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание курса..."
              rows={4}
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <Link className={styles.cancelLink} href="/catalog">
              Отмена
            </Link>
            <button
              className={styles.createButton}
              disabled={!canCreate || saving}
              onClick={handleCreate}
            >
              {saving ? "Создание..." : "Создать и открыть"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
