import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  const selectLesson = useCourseBuilderStore((s) => s.selectLesson);
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.task} ${isSelected ? styles.selected : ""}`}
      onClick={() => {
        selectLesson(lessonId);
        selectTask(task.id);
      }}
    >
      <div
        className={styles.dragHandle}
        {...attributes}
        {...listeners}
        title="Перетащить для изменения порядка"
      >
        ::
      </div>

      <span className={styles.typeLabel}>
        {TASK_TYPE_LABELS[task.taskType]}
      </span>

      <input
        className={styles.taskTitle}
        value={task.title}
        onChange={handleTitleChange}
        autoFocus={Boolean(task.id?.startsWith("local_"))}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") {
            e.currentTarget.blur();
          }
        }}
        placeholder="Название блока"
      />

      <button
        className={styles.duplicateBtn}
        onClick={(e) => {
          e.stopPropagation();
          if (!task.id) return;
          void duplicateTask(lessonId, task.id);
        }}
        title="Дублировать блок"
      >
        ⧉
      </button>

      <button
        className={styles.removeBtn}
        onClick={(e) => {
          e.stopPropagation();
          removeTaskRequest("task", task.id!, task.title, lessonId);
        }}
        title="Удалить блок"
      >
        ✕
      </button>
    </div>
  );
}
