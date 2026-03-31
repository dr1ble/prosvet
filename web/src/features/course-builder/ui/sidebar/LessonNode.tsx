import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Book,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import type { BuilderLesson } from "../../types";
import { TASK_TYPE_LABELS } from "../../types";
import { useCourseBuilderStore } from "../../store";
import { TaskNode } from "./TaskNode";

import styles from "./LessonNode.module.css";

interface LessonNodeProps {
  lesson: BuilderLesson;
  isSelected: boolean;
  onSelect: () => void;
}

export function LessonNode({ lesson, isSelected, onSelect }: LessonNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const addTask = useCourseBuilderStore((s) => s.addTask);
  const removeLesson = useCourseBuilderStore((s) => s.removeLesson);
  const updateLesson = useCourseBuilderStore((s) => s.updateLesson);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${lesson.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    updateLesson(lesson.id!, { title: e.target.value });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.node} ${isSelected ? styles.selected : ""}`}
    >
      <div className={styles.header}>
        <div className={styles.dragHandle} {...attributes} {...listeners}>
          <GripVertical size={14} />
        </div>

        <button
          className={styles.expandBtn}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <Book size={14} className={styles.icon} />

        <input
          className={styles.titleInput}
          value={lesson.title}
          onChange={handleTitleChange}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        />

        <button
          className={styles.removeBtn}
          onClick={() => removeLesson(lesson.id!)}
          title="Удалить урок"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className={styles.tasks}>
          {lesson.tasks.map((task) => (
            <TaskNode key={`${task.id}`} lessonId={lesson.id!} task={task} />
          ))}

          <div className={styles.addTaskRow}>
            <select
              className={styles.taskTypeSelect}
              onChange={(e) => {
                if (e.target.value) {
                  addTask(
                    lesson.id!,
                    e.target
                      .value as BuilderLesson["tasks"][number]["taskType"],
                  );
                  e.target.value = "";
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>
                + Добавить задачу
              </option>
              {Object.entries(TASK_TYPE_LABELS).map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
