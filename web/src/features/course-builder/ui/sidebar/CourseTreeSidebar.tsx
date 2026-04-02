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

import { useCourseBuilderStore } from "../../store";
import { LessonNode } from "./LessonNode";

import styles from "./CourseTreeSidebar.module.css";

export function CourseTreeSidebar() {
  const course = useCourseBuilderStore((s) => s.course);
  const selectedLessonId = useCourseBuilderStore((s) => s.selectedLessonId);
  const selectLesson = useCourseBuilderStore((s) => s.selectLesson);
  const addLesson = useCourseBuilderStore((s) => s.addLesson);
  const reorderLessons = useCourseBuilderStore((s) => s.reorderLessons);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (!course) {
    return (
      <div className={styles.empty}>
        <p>Загрузка...</p>
      </div>
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !course) return;

    const oldIndex = course.lessons.findIndex((l) => `${l.id}` === active.id);
    const newIndex = course.lessons.findIndex((l) => `${l.id}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    reorderLessons(oldIndex, newIndex);
  }

  const lessonIds = course.lessons.map((l) => `${l.id}`);

  return (
    <div className={styles.container}>
      <div className={styles.courseHeader}>
        <span className={styles.courseTitle}>Структура курса</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={lessonIds}
          strategy={verticalListSortingStrategy}
        >
          <div className={styles.list}>
            {course.lessons.map((lesson) => (
              <LessonNode
                key={`${lesson.id}`}
                lesson={lesson}
                isSelected={
                  selectedLessonId === lesson.id ||
                  `${selectedLessonId}` === `${lesson.id}`
                }
                onSelect={() => selectLesson(lesson.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button className={styles.addBtn} onClick={addLesson}>
        Добавить урок
      </button>
    </div>
  );
}
