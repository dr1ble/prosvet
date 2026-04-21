import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
  const removeLessonRequest = useCourseBuilderStore((s) => s.requestDelete);
  const updateLesson = useCourseBuilderStore((s) => s.updateLesson);
  const reorderTasks = useCourseBuilderStore((s) => s.reorderTasks);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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

  function handleTaskDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = lesson.tasks.findIndex((t) => `${t.id}` === active.id);
    const newIndex = lesson.tasks.findIndex((t) => `${t.id}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    reorderTasks(lesson.id!, oldIndex, newIndex);
  }

  const taskIds = lesson.tasks.map((t) => `${t.id}`);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.node} ${isSelected ? styles.selected : ""}`}
    >
      <div className={styles.header}>
        <div className={styles.dragHandle} {...attributes} {...listeners}>
          ::
        </div>

        <button
          className={styles.expandBtn}
          onClick={() => setExpanded(!expanded)}
          title={expanded ? "Свернуть" : "Развернуть"}
        >
          {expanded ? "▾" : "▸"}
        </button>

        <input
          className={styles.titleInput}
          value={lesson.title}
          onChange={handleTitleChange}
          autoFocus={Boolean(lesson.id?.startsWith("local_"))}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              e.currentTarget.blur();
            }
          }}
        />

        <button
          className={styles.removeBtn}
          onClick={() =>
            removeLessonRequest("lesson", lesson.id!, lesson.title)
          }
          title="Удалить урок"
        >
          ✕
        </button>
      </div>

      {expanded && (
        <>
          {lesson.description && (
            <div className={styles.description}>{lesson.description}</div>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleTaskDragEnd}
          >
            <SortableContext
              items={taskIds}
              strategy={verticalListSortingStrategy}
            >
              <div className={styles.tasks}>
                {lesson.tasks.map((task) => (
                  <TaskNode
                    key={`${task.id}`}
                    lessonId={lesson.id!}
                    task={task}
                  />
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
                      + Добавить блок
                    </option>
                    {Object.entries(TASK_TYPE_LABELS).map(([type, label]) => (
                      <option key={type} value={type}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  );
}
