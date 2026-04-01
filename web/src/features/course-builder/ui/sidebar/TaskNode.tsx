import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, CheckCircle, Circle, GripVertical, Copy } from "lucide-react";

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
  const removeTaskRequest = useCourseBuilderStore((s) => s.requestDelete);
  const duplicateTask = useCourseBuilderStore((s) => s.duplicateTask);
  const updateTask = useCourseBuilderStore((s) => s.updateTask);

  const isSelected =
    selectedTaskId === task.id || `${selectedTaskId}` === `${task.id}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${task.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    updateTask(lessonId, task.id!, { title: e.target.value });
  }

  function toggleRequired() {
    updateTask(lessonId, task.id!, { required: !task.required });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.task} ${isSelected ? styles.selected : ""}`}
      onClick={() => selectTask(task.id)}
    >
      <div
        className={styles.dragHandle}
        {...attributes}
        {...listeners}
        title="Перетащить для изменения порядка"
      >
        <GripVertical size={12} />
      </div>

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
        className={styles.duplicateBtn}
        onClick={(e) => {
          e.stopPropagation();
          if (!task.id) return;
          void duplicateTask(lessonId, task.id);
        }}
        title="Дублировать задачу"
      >
        <Copy size={12} />
      </button>

      <button
        className={styles.removeBtn}
        onClick={(e) => {
          e.stopPropagation();
          removeTaskRequest("task", task.id!, task.title, lessonId);
        }}
        title="Удалить задачу"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
