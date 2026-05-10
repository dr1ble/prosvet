"use client";

import { useState } from "react";
import { useWizardStore } from "../store";
import styles from "./step-lessons.module.css";

type StepLessonsProps = {
  onNext: () => void;
  onPrev: () => void;
};

export function StepLessons({ onNext, onPrev }: StepLessonsProps) {
  const lessons = useWizardStore((s) => s.lessons);
  const addLesson = useWizardStore((s) => s.addLesson);
  const updateLesson = useWizardStore((s) => s.updateLesson);
  const removeLesson = useWizardStore((s) => s.removeLesson);
  const [editId, setEditId] = useState<string | null>(null);

  const canProceed =
    lessons.length > 0 && lessons.every((l) => l.title.trim().length > 0);

  const handleAdd = () => {
    const id = addLesson();
    setEditId(id);
  };

  return (
    <div className={styles.card}>
      <header className={styles.cardHeader}>
        <p className={styles.kicker}>Шаг 2 из 4</p>
        <h2 className={styles.cardTitle}>Уроки</h2>
        <p className={styles.cardSubtitle}>
          Добавьте уроки курса. Каждый урок может содержать несколько модулей
          разных типов: теория, видео, тест, симуляция, памятка.
        </p>
      </header>

      {lessons.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Уроков пока нет</p>
          <p className={styles.emptyDesc}>
            Добавьте первый урок — это разделы вашего курса. Каждый урок может
            содержать текст, видео, тесты, симуляции и памятки.
          </p>
          <button
            type="button"
            className={styles.emptyAddBtn}
            onClick={handleAdd}
          >
            + Добавить первый урок
          </button>
        </div>
      )}

      {lessons.length > 0 && (
        <>
          <ul className={styles.list}>
            {lessons
              .sort((a, b) => a.order - b.order)
              .map((lesson) => (
                <li key={lesson.localId} className={styles.item}>
                  {editId === lesson.localId ? (
                    <div className={styles.editRow}>
                      <input
                        className={styles.input}
                        value={lesson.title}
                        onChange={(e) =>
                          updateLesson(lesson.localId, {
                            title: e.target.value,
                          })
                        }
                        placeholder="Название урока"
                        autoFocus
                      />
                      <button
                        type="button"
                        className={styles.confirmBtn}
                        onClick={() => setEditId(null)}
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <div className={styles.displayRow}>
                      <span className={styles.lessonTitle}>
                        {lesson.title || "Без названия"}
                      </span>
                      <div className={styles.itemActions}>
                        <button
                          type="button"
                          className={styles.editBtn}
                          onClick={() => setEditId(lesson.localId)}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => removeLesson(lesson.localId)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
          </ul>

          <button type="button" className={styles.addBtn} onClick={handleAdd}>
            + Добавить урок
          </button>
        </>
      )}

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
          className={styles.buttonPrimary}
          onClick={onNext}
          disabled={!canProceed}
        >
          Далее: Модули →
        </button>
      </div>
    </div>
  );
}
