import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from "lucide-react";
import { useState } from "react";

import styles from "./QuizTaskEditor.module.css";

interface QuizQuestion {
  type: "single_choice" | "multiple_choice" | "matching";
  question: string;
  options: { text: string; correct: boolean }[];
  pairs?: { left: string; right: string }[];
}

interface QuizTaskEditorProps {
  value: { questions?: QuizQuestion[] };
  onChange: (value: { questions: QuizQuestion[] }) => void;
}

export function QuizTaskEditor({ value, onChange }: QuizTaskEditorProps) {
  const questions: QuizQuestion[] = value.questions || [];

  function addQuestion(type: QuizQuestion["type"]) {
    const newQuestion: QuizQuestion = {
      type,
      question: "",
      options: type === "matching" ? [] : [{ text: "", correct: false }],
      pairs: type === "matching" ? [{ left: "", right: "" }] : undefined,
    };
    onChange({ questions: [...questions, newQuestion] });
  }

  function updateQuestion(index: number, patch: Partial<QuizQuestion>) {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...patch };
    onChange({ questions: updated });
  }

  function removeQuestion(index: number) {
    onChange({ questions: questions.filter((_, i) => i !== index) });
  }

  function moveQuestion(from: number, to: number) {
    const updated = [...questions];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onChange({ questions: updated });
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Конструктор квизов</h3>
        <div className={styles.addButtons}>
          <button
            className={styles.addBtn}
            onClick={() => addQuestion("single_choice")}
          >
            + Один ответ
          </button>
          <button
            className={styles.addBtn}
            onClick={() => addQuestion("multiple_choice")}
          >
            + Несколько ответов
          </button>
          <button
            className={styles.addBtn}
            onClick={() => addQuestion("matching")}
          >
            + Сопоставление
          </button>
        </div>
      </div>

      {questions.length === 0 && (
        <div className={styles.empty}>
          Добавьте первый вопрос, выбрав тип выше
        </div>
      )}

      {questions.map((q, index) => (
        <QuestionCard
          key={index}
          question={q}
          index={index}
          total={questions.length}
          onUpdate={(patch) => updateQuestion(index, patch)}
          onRemove={() => removeQuestion(index)}
          onMove={(to) => moveQuestion(index, to)}
        />
      ))}
    </div>
  );
}

function QuestionCard({
  question,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  question: QuizQuestion;
  index: number;
  total: number;
  onUpdate: (patch: Partial<QuizQuestion>) => void;
  onRemove: () => void;
  onMove: (to: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const typeLabel =
    question.type === "single_choice"
      ? "Один ответ"
      : question.type === "multiple_choice"
        ? "Несколько ответов"
        : "Сопоставление";

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardLeft}>
          <span className={styles.dragHandle}>
            <GripVertical size={14} />
          </span>
          <span className={styles.questionNum}>Вопрос {index + 1}</span>
          <span className={styles.typeBadge}>{typeLabel}</span>
        </div>
        <div className={styles.cardActions}>
          <button
            className={styles.iconBtn}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          {index > 0 && (
            <button
              className={styles.iconBtn}
              onClick={() => onMove(index - 1)}
            >
              ↑
            </button>
          )}
          {index < total - 1 && (
            <button
              className={styles.iconBtn}
              onClick={() => onMove(index + 1)}
            >
              ↓
            </button>
          )}
          <button
            className={`${styles.iconBtn} ${styles.danger}`}
            onClick={onRemove}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className={styles.cardBody}>
          <div className={styles.field}>
            <label>Текст вопроса</label>
            <input
              className={styles.input}
              value={question.question}
              onChange={(e) => onUpdate({ question: e.target.value })}
              placeholder="Введите вопрос..."
            />
          </div>

          {question.type !== "matching" && (
            <OptionsEditor
              options={question.options}
              type={question.type}
              onChange={(options) => onUpdate({ options })}
            />
          )}

          {question.type === "matching" && (
            <MatchingEditor
              pairs={question.pairs || []}
              onChange={(pairs) => onUpdate({ pairs })}
            />
          )}
        </div>
      )}
    </div>
  );
}

function OptionsEditor({
  options,
  type,
  onChange,
}: {
  options: { text: string; correct: boolean }[];
  type: "single_choice" | "multiple_choice";
  onChange: (options: { text: string; correct: boolean }[]) => void;
}) {
  function updateOption(
    index: number,
    patch: { text?: string; correct?: boolean },
  ) {
    const updated = [...options];
    updated[index] = { ...updated[index], ...patch };

    if (type === "single_choice" && patch.correct) {
      for (let i = 0; i < updated.length; i++) {
        if (i !== index) updated[i] = { ...updated[i], correct: false };
      }
    }

    onChange(updated);
  }

  function addOption() {
    onChange([...options, { text: "", correct: false }]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    onChange(options.filter((_, i) => i !== index));
  }

  return (
    <div className={styles.optionsSection}>
      <label>
        Варианты ответов {type === "multiple_choice" && "(можно несколько)"}
      </label>
      {options.map((opt, i) => (
        <div key={i} className={styles.optionRow}>
          <label className={styles.checkboxLabel}>
            <input
              type={type === "single_choice" ? "radio" : "checkbox"}
              checked={opt.correct}
              onChange={(e) => updateOption(i, { correct: e.target.checked })}
              className={styles.checkbox}
            />
            <span className={styles.checkmark} />
          </label>
          <input
            className={styles.optionInput}
            value={opt.text}
            onChange={(e) => updateOption(i, { text: e.target.value })}
            placeholder={`Вариант ${i + 1}`}
          />
          <button
            className={`${styles.iconBtn} ${styles.danger}`}
            onClick={() => removeOption(i)}
            disabled={options.length <= 2}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button className={styles.addOptionBtn} onClick={addOption}>
        <Plus size={14} /> Добавить вариант
      </button>
    </div>
  );
}

function MatchingEditor({
  pairs,
  onChange,
}: {
  pairs: { left: string; right: string }[];
  onChange: (pairs: { left: string; right: string }[]) => void;
}) {
  function updatePair(index: number, side: "left" | "right", value: string) {
    const updated = [...pairs];
    updated[index] = { ...updated[index], [side]: value };
    onChange(updated);
  }

  function addPair() {
    onChange([...pairs, { left: "", right: "" }]);
  }

  function removePair(index: number) {
    if (pairs.length <= 2) return;
    onChange(pairs.filter((_, i) => i !== index));
  }

  return (
    <div className={styles.optionsSection}>
      <label>Пары для сопоставления</label>
      <div className={styles.matchingHeader}>
        <span>Левая колонка</span>
        <span>Правая колонка</span>
        <span />
      </div>
      {pairs.map((pair, i) => (
        <div key={i} className={styles.matchingRow}>
          <input
            className={styles.matchingInput}
            value={pair.left}
            onChange={(e) => updatePair(i, "left", e.target.value)}
            placeholder={`Элемент ${i + 1}`}
          />
          <span className={styles.matchingArrow}>→</span>
          <input
            className={styles.matchingInput}
            value={pair.right}
            onChange={(e) => updatePair(i, "right", e.target.value)}
            placeholder={`Соответствие ${i + 1}`}
          />
          <button
            className={`${styles.iconBtn} ${styles.danger}`}
            onClick={() => removePair(i)}
            disabled={pairs.length <= 2}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button className={styles.addOptionBtn} onClick={addPair}>
        <Plus size={14} /> Добавить пару
      </button>
    </div>
  );
}
