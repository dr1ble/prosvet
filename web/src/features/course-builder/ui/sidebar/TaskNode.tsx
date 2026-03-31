import { Trash2, CheckCircle, Circle } from "lucide-react";

import type { BuilderTask } from "../../types";
import { TASK_TYPE_LABELS } from "../../types";
import { useCourseBuilderStore } from "../../store";

import styles from "./TaskNode.module.css";

interface TaskNodeProps {
  lessonId: string;
  task: BuilderTask;
}

export function TaskNode({ lessonId, task }: TaskNodeProps) {
  const selectedTaskId = useCourseBuilderStore((s) => s.selectedTaskId);
  const selectTask = useCourseBuilderStore((s) => s.selectTask);
  const removeTask = useCourseBuilderStore((s) => s.removeTask);
  const updateTask = useCourseBuilderStore((s) => s.updateTask);

  const isSelected =
    selectedTaskId === task.id || `${selectedTaskId}` === `${task.id}`;

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    updateTask(lessonId, task.id!, { title: e.target.value });
  }

  function toggleRequired() {
    updateTask(lessonId, task.id!, { required: !task.required });
  }

  return (
    <div
      className={`${styles.task} ${isSelected ? styles.selected : ""}`}
      onClick={() => selectTask(task.id)}
    >
      <button
        className={styles.requiredBtn}
        onClick={(e) => {
          e.stopPropagation();
          toggleRequired();
        }}
      >
        {task.required ? <CheckCircle size={14} /> : <Circle size={14} />}
      </button>

      <span className={styles.typeLabel}>
        {TASK_TYPE_LABELS[task.taskType]}
      </span>

      <input
        className={styles.taskTitle}
        value={task.title}
        onChange={handleTitleChange}
        onClick={(e) => e.stopPropagation()}
        placeholder="Название задачи"
      />

      <button
        className={styles.removeBtn}
        onClick={(e) => {
          e.stopPropagation();
          removeTask(lessonId, task.id!);
        }}
        title="Удалить задачу"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
