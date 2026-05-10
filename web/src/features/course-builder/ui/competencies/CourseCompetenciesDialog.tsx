import { useEffect, useMemo, useState } from "react";

import { toUserErrorMessage } from "@/shared/lib/api-error";

import {
  createCompetency,
  deactivateCompetency,
  listCompetencies,
  listCourseCompetencies,
  saveCourseCompetencies,
} from "../../api";
import type { Competency, CourseType } from "../../types";
import { COURSE_TYPE_LABELS } from "../../types";

import styles from "./CourseCompetenciesDialog.module.css";

interface SelectedCompetency {
  competencyKey: string;
  courseType: CourseType;
}

interface CourseCompetenciesDialogProps {
  courseId: string;
  onClose: () => void;
}

const COURSE_TYPE_OPTIONS = Object.entries(COURSE_TYPE_LABELS) as Array<
  [CourseType, string]
>;

export function CourseCompetenciesDialog({
  courseId,
  onClose,
}: CourseCompetenciesDialogProps) {
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [selected, setSelected] = useState<SelectedCompetency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivatingKey, setIsDeactivatingKey] = useState<string | null>(
    null,
  );
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const selectedByKey = useMemo(() => {
    return new Map(
      selected.map((item) => [item.competencyKey, item.courseType]),
    );
  }, [selected]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [nextCompetencies, links] = await Promise.all([
          listCompetencies(),
          listCourseCompetencies(courseId),
        ]);
        if (!isMounted) return;
        setCompetencies(nextCompetencies.filter((item) => item.isActive));
        setSelected(
          links.map((link) => ({
            competencyKey: link.competencyKey,
            courseType: link.courseType,
          })),
        );
      } catch (err) {
        if (!isMounted) return;
        setError(toUserErrorMessage(err, "Не удалось загрузить компетенции."));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  function toggleCompetency(competencyKey: string) {
    setSelected((current) => {
      if (current.some((item) => item.competencyKey === competencyKey)) {
        return current.filter((item) => item.competencyKey !== competencyKey);
      }
      return [...current, { competencyKey, courseType: "foundation" }];
    });
  }

  function updateCourseType(competencyKey: string, courseType: CourseType) {
    setSelected((current) =>
      current.map((item) =>
        item.competencyKey === competencyKey ? { ...item, courseType } : item,
      ),
    );
  }

  async function handleAddCompetency() {
    const title = newTitle.trim();
    if (!title) {
      setError("Введите название компетенции.");
      return;
    }

    setError(null);
    try {
      const competency = await createCompetency({
        title,
        description: newDescription.trim() || null,
        category: newCategory.trim() || null,
      });
      setCompetencies((current) => [...current, competency]);
      setSelected((current) => [
        ...current,
        { competencyKey: competency.key, courseType: "foundation" },
      ]);
      setNewTitle("");
      setNewDescription("");
      setNewCategory("");
      setShowCreateModal(false);
    } catch (err) {
      setError(toUserErrorMessage(err, "Не удалось добавить компетенцию."));
    }
  }

  async function handleDeactivateCompetency(competency: Competency) {
    if (!window.confirm(`Скрыть компетенцию "${competency.title}"?`)) {
      return;
    }
    setError(null);
    setIsDeactivatingKey(competency.key);
    try {
      await deactivateCompetency(competency.key);
      setCompetencies((current) =>
        current.filter((item) => item.key !== competency.key),
      );
      setSelected((current) =>
        current.filter((item) => item.competencyKey !== competency.key),
      );
    } catch (err) {
      setError(
        toUserErrorMessage(err, "Не удалось деактивировать компетенцию."),
      );
    } finally {
      setIsDeactivatingKey(null);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      await saveCourseCompetencies(courseId, selected);
      onClose();
    } catch (err) {
      setError(
        toUserErrorMessage(err, "Не удалось сохранить компетенции курса."),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <section
        className={styles.dialog}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2>Компетенции курса</h2>
            <p>Выберите, какие навыки развивает этот курс.</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
          >
            Закрыть
          </button>
        </header>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.content}>
          {isLoading ? (
            <p className={styles.muted}>Загружаем компетенции...</p>
          ) : (
            competencies.map((competency) => {
              const courseType = selectedByKey.get(competency.key);
              const isSelected = Boolean(courseType);
              return (
                <article key={competency.key} className={styles.competencyRow}>
                  <div className={styles.rowHead}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCompetency(competency.key)}
                      />
                      <strong>{competency.title}</strong>
                    </label>
                    <div className={styles.menuWrap}>
                      <button
                        type="button"
                        className={styles.menuButton}
                        onClick={() =>
                          setOpenMenuKey((current) =>
                            current === competency.key ? null : competency.key,
                          )
                        }
                        aria-label="Действия"
                        title="Действия"
                        disabled={isSaving}
                      >
                        ⋯
                      </button>
                      {openMenuKey === competency.key ? (
                        <div className={styles.menuPopup}>
                          <button
                            type="button"
                            className={styles.menuDanger}
                            onClick={() => {
                              setOpenMenuKey(null);
                              void handleDeactivateCompetency(competency);
                            }}
                            disabled={
                              isDeactivatingKey === competency.key || isSaving
                            }
                          >
                            {isDeactivatingKey === competency.key
                              ? "Скрываем..."
                              : "Скрыть"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {competency.category ? (
                    <p className={styles.category}>{competency.category}</p>
                  ) : null}
                  {competency.description ? (
                    <p className={styles.description}>
                      {competency.description}
                    </p>
                  ) : null}
                  {isSelected ? (
                    <label className={styles.typeField}>
                      Тип курса
                      <select
                        value={courseType}
                        onChange={(event) =>
                          updateCourseType(
                            competency.key,
                            event.target.value as CourseType,
                          )
                        }
                      >
                        {COURSE_TYPE_OPTIONS.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </article>
              );
            })
          )}
        </div>

        <div className={styles.createBlock}>
          <button
            type="button"
            className={styles.addButton}
            onClick={() => setShowCreateModal(true)}
          >
            + Добавить новую компетенцию
          </button>
        </div>

        <footer className={styles.footer}>
          <button type="button" onClick={onClose} disabled={isSaving}>
            Отмена
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? "Сохраняем..." : "Сохранить"}
          </button>
        </footer>

        {showCreateModal ? (
          <div
            className={styles.addOverlay}
            onClick={() => setShowCreateModal(false)}
          >
            <section
              className={styles.addDialog}
              onClick={(event) => event.stopPropagation()}
            >
              <h3>Новая компетенция</h3>
              <div className={styles.createForm}>
                <label>
                  Название компетенции
                  <input
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                    autoFocus
                  />
                </label>
                <label>
                  Описание
                  <textarea
                    value={newDescription}
                    onChange={(event) => setNewDescription(event.target.value)}
                    rows={3}
                  />
                </label>
                <label>
                  Категория
                  <input
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                  />
                </label>
              </div>
              <div className={styles.inlineActions}>
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  Отмена
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => void handleAddCompetency()}
                >
                  Добавить
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}
