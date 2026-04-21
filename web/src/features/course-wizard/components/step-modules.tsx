"use client";

import { useState } from "react";
import { useWizardStore } from "../store";
import type { TaskType } from "@/features/catalog/types";
import styles from "./step-modules.module.css";

const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: "theory_text", label: "Теория" },
  { value: "theory_video", label: "Видео" },
  { value: "quiz", label: "Тест" },
  { value: "simulation", label: "Симуляция" },
  { value: "cheat_sheet", label: "Шпаргалка" },
];

type StepModulesProps = {
  onNext: () => void;
  onPrev: () => void;
  onSave: () => void;
};

export function StepModules({ onNext, onPrev, onSave }: StepModulesProps) {
  const lessons = useWizardStore((s) => s.lessons);
  const modules = useWizardStore((s) => s.modules);
  const addModule = useWizardStore((s) => s.addModule);
  const removeModule = useWizardStore((s) => s.removeModule);
  const updateModule = useWizardStore((s) => s.updateModule);
  const saving = useWizardStore((s) => s.saving);

  const [selectedLessonId, setSelectedLessonId] = useState(
    lessons[0]?.localId ?? null,
  );
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const lessonModules = modules
    .filter((m) => m.lessonLocalId === selectedLessonId)
    .sort((a, b) => a.order - b.order);

  const selectedModule = modules.find((m) => m.localId === selectedModuleId);

  const handleAdd = (taskType: TaskType) => {
    if (!selectedLessonId) return;
    const newId = addModule(selectedLessonId, taskType);
    setSelectedModuleId(newId);
  };

  const handleSelectModule = (localId: string) => {
    setSelectedModuleId(localId);
  };

  if (lessons.length === 0) {
    return (
      <div className={styles.card}>
        <header className={styles.cardHeader}>
          <p className={styles.kicker}>Шаг 3 из 4</p>
          <h2 className={styles.cardTitle}>Модули и контент</h2>
          <p className={styles.cardSubtitle}>
            Добавьте модули к урокам и заполните их содержимым.
          </p>
        </header>
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Сначала добавьте уроки</p>
          <p className={styles.emptyDesc}>
            Модули добавляются к урокам. Вернитесь на предыдущий шаг и создайте
            хотя бы один урок.
          </p>
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
            className={styles.buttonPrimary}
            onClick={onNext}
            disabled
          >
            Далее: Публикация →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <header className={styles.cardHeader}>
        <p className={styles.kicker}>Шаг 3 из 4</p>
        <h2 className={styles.cardTitle}>Модули и контент</h2>
        <p className={styles.cardSubtitle}>
          Добавьте модули к урокам и заполните их содержимым.
        </p>
      </header>

      <div className={styles.lessonTabs}>
        {lessons.map((l) => (
          <button
            key={l.localId}
            type="button"
            className={`${styles.lessonTab} ${selectedLessonId === l.localId ? styles.lessonTabActive : ""}`}
            onClick={() => {
              setSelectedLessonId(l.localId);
              setSelectedModuleId(null);
            }}
          >
            {l.title || "Без названия"}
          </button>
        ))}
      </div>

      <div className={styles.layout}>
        <div className={styles.leftPanel}>
          <div className={styles.moduleListWrapper}>
            <div className={styles.moduleList}>
              {lessonModules.length === 0 && (
                <p className={styles.moduleListEmpty}>Нет модулей</p>
              )}
              {lessonModules.map((mod) => (
                <div
                  key={mod.localId}
                  className={`${styles.moduleItem} ${selectedModuleId === mod.localId ? styles.moduleItemSelected : ""}`}
                  onClick={() => handleSelectModule(mod.localId)}
                >
                  <div className={styles.moduleItemInfo}>
                    <span className={styles.moduleItemType}>
                      {TASK_TYPE_OPTIONS.find((t) => t.value === mod.taskType)
                        ?.label ?? mod.taskType}
                    </span>
                    <span className={styles.moduleItemTitle}>
                      {mod.title || "Без названия"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.moduleItemDelete}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeModule(mod.localId);
                      if (selectedModuleId === mod.localId) {
                        setSelectedModuleId(null);
                      }
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.addSection}>
            <p className={styles.addLabel}>Добавить модуль:</p>
            <div className={styles.addGrid}>
              {TASK_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={styles.addTypeBtn}
                  onClick={() => handleAdd(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.rightPanel}>
          {selectedModule ? (
            <ModuleEditor module={selectedModule} onUpdate={updateModule} />
          ) : (
            <div className={styles.editorEmpty}>
              <p className={styles.editorEmptyTitle}>Выберите модуль</p>
              <p className={styles.editorEmptyDesc}>
                Нажмите на модуль в списке слева, чтобы редактировать его
                содержимое, или добавьте новый модуль.
              </p>
            </div>
          )}
        </div>
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
          className={styles.buttonSecondary}
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Сохранение..." : "Сохранить"}
        </button>
        <button type="button" className={styles.buttonPrimary} onClick={onNext}>
          Далее: Публикация →
        </button>
      </div>
    </div>
  );
}

type ModuleEditorProps = {
  module: {
    localId: string;
    taskType: TaskType;
    title: string;
    payload: Record<string, unknown>;
  };
  onUpdate: (
    localId: string,
    patch: Partial<{ title: string; payload: Record<string, unknown> }>,
  ) => void;
};

function ModuleEditor({ module, onUpdate }: ModuleEditorProps) {
  return (
    <div>
      <label className={styles.field}>
        <span className={styles.label}>Название модуля</span>
        <input
          className={styles.input}
          value={module.title}
          onChange={(e) => onUpdate(module.localId, { title: e.target.value })}
          placeholder="Название"
        />
      </label>

      {module.taskType === "theory_text" && (
        <label className={styles.field}>
          <span className={styles.label}>Содержание</span>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={(module.payload.content as string) ?? ""}
            onChange={(e) =>
              onUpdate(module.localId, {
                payload: { ...module.payload, content: e.target.value },
              })
            }
            placeholder="Введите текст..."
            rows={10}
          />
        </label>
      )}

      {module.taskType === "theory_video" && (
        <>
          <label className={styles.field}>
            <span className={styles.label}>URL видео</span>
            <input
              className={styles.input}
              value={(module.payload.video_url as string) ?? ""}
              onChange={(e) =>
                onUpdate(module.localId, {
                  payload: { ...module.payload, video_url: e.target.value },
                })
              }
              placeholder="https://..."
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Длительность (сек)</span>
            <input
              className={styles.input}
              type="number"
              value={(module.payload.duration as number) ?? 0}
              onChange={(e) =>
                onUpdate(module.localId, {
                  payload: {
                    ...module.payload,
                    duration: parseInt(e.target.value) || 0,
                  },
                })
              }
            />
          </label>
        </>
      )}

      {module.taskType === "quiz" && (
        <QuizEditor module={module} onUpdate={onUpdate} />
      )}

      {module.taskType === "simulation" && (
        <label className={styles.field}>
          <span className={styles.label}>Конфигурация (JSON)</span>
          <textarea
            className={`${styles.input} ${styles.codearea}`}
            value={JSON.stringify(module.payload.config ?? {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onUpdate(module.localId, {
                  payload: { ...module.payload, config: parsed },
                });
              } catch {
                // ignore invalid JSON
              }
            }}
            rows={8}
          />
        </label>
      )}

      {module.taskType === "cheat_sheet" && (
        <label className={styles.field}>
          <span className={styles.label}>Содержание</span>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={(module.payload.content as string) ?? ""}
            onChange={(e) =>
              onUpdate(module.localId, {
                payload: { ...module.payload, content: e.target.value },
              })
            }
            placeholder="Краткая справка..."
            rows={8}
          />
        </label>
      )}
    </div>
  );
}

type QuizEditorProps = {
  module: {
    localId: string;
    payload: Record<string, unknown>;
  };
  onUpdate: (
    localId: string,
    patch: Partial<{ payload: Record<string, unknown> }>,
  ) => void;
};

function QuizEditor({ module, onUpdate }: QuizEditorProps) {
  const questions =
    (module.payload.questions as Array<Record<string, unknown>>) ?? [];

  const addQuestion = () => {
    const newQuestions = [
      ...questions,
      { question: "", options: ["", ""], correct: 0 },
    ];
    onUpdate(module.localId, {
      payload: { ...module.payload, questions: newQuestions },
    });
  };

  const updateQuestion = (index: number, patch: Record<string, unknown>) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...patch };
    onUpdate(module.localId, {
      payload: { ...module.payload, questions: newQuestions },
    });
  };

  const removeQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    onUpdate(module.localId, {
      payload: { ...module.payload, questions: newQuestions },
    });
  };

  return (
    <div>
      {questions.map((q, index) => (
        <div key={index} className={styles.questionBlock}>
          <div className={styles.questionHeader}>
            <span>Вопрос {index + 1}</span>
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => removeQuestion(index)}
            >
              ✕
            </button>
          </div>
          <input
            className={styles.input}
            value={(q.question as string) ?? ""}
            onChange={(e) =>
              updateQuestion(index, { question: e.target.value })
            }
            placeholder="Текст вопроса"
          />
          {(q.options as string[])?.map((opt, optIdx) => (
            <div key={optIdx} className={styles.optionRow}>
              <input
                type="radio"
                name={`q${index}-correct`}
                checked={(q.correct as number) === optIdx}
                onChange={() => updateQuestion(index, { correct: optIdx })}
              />
              <input
                className={styles.input}
                value={opt}
                onChange={(e) => {
                  const newOptions = [...(q.options as string[])];
                  newOptions[optIdx] = e.target.value;
                  updateQuestion(index, { options: newOptions });
                }}
                placeholder={`Вариант ${optIdx + 1}`}
              />
            </div>
          ))}
          <button
            type="button"
            className={styles.smallBtn}
            onClick={() => {
              const newOptions = [...(q.options as string[]), ""];
              updateQuestion(index, { options: newOptions });
            }}
          >
            + Вариант
          </button>
        </div>
      ))}
      <button type="button" className={styles.addBtn} onClick={addQuestion}>
        + Добавить вопрос
      </button>
    </div>
  );
}
