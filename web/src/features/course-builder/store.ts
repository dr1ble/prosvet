import { create } from "zustand";

import type {
  BuilderCourse,
  BuilderLesson,
  BuilderTask,
  TaskType,
  ValidationError,
} from "./types";
import { defaultPayload } from "./types";

let nextLocalId = 1;
function genLocalId(): string {
  return `local_${nextLocalId++}`;
}

function cloneCourse(course: BuilderCourse): BuilderCourse {
  return JSON.parse(JSON.stringify(course)) as BuilderCourse;
}

export interface CourseBuilderState {
  courseId: string;
  course: BuilderCourse | null;
  selectedTaskId: string | null;
  selectedLessonId: string | null;
  previewOpen: boolean;
  publishDialogOpen: boolean;
  pendingDelete: {
    type: "lesson" | "task";
    id: string;
    lessonId?: string;
    title: string;
  } | null;
  historyPast: BuilderCourse[];
  historyFuture: BuilderCourse[];
  canUndo: boolean;
  canRedo: boolean;

  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  isLoading: boolean;
  error: string | null;
  validationErrors: ValidationError[];

  loadCourse: (courseId: string) => Promise<void>;
  updateCourseMeta: (patch: Partial<Pick<BuilderCourse, "title">>) => void;
  selectTask: (taskId: string | null) => void;
  selectLesson: (lessonId: string | null) => void;
  togglePreview: () => void;
  openPublishDialog: () => void;
  closePublishDialog: () => void;
  requestDelete: (
    type: "lesson" | "task",
    id: string,
    title: string,
    lessonId?: string,
  ) => void;
  confirmDelete: () => void;
  cancelDelete: () => void;

  addLesson: () => void;
  removeLesson: (lessonId: string) => void;
  updateLesson: (
    lessonId: string,
    patch: Partial<Pick<BuilderLesson, "title" | "description">>,
  ) => void;
  reorderLessons: (fromIndex: number, toIndex: number) => void;

  addTask: (lessonId: string, taskType: TaskType) => void;
  removeTask: (lessonId: string, taskId: string) => void;
  duplicateTask: (lessonId: string, taskId: string) => Promise<void>;
  updateTask: (
    lessonId: string,
    taskId: string,
    patch: Partial<BuilderTask>,
  ) => void;
  reorderTasks: (lessonId: string, fromIndex: number, toIndex: number) => void;

  save: () => Promise<void>;
  validate: () => Promise<void>;
  publish: (version: string, changelog?: string) => Promise<void>;
  rollback: (
    releaseId: string,
    version: string,
    changelog?: string,
  ) => Promise<void>;
  undo: () => void;
  redo: () => void;

  reset: () => void;
}

export const useCourseBuilderStore = create<CourseBuilderState>((set, get) => ({
  courseId: "",
  course: null,
  selectedTaskId: null,
  selectedLessonId: null,
  previewOpen: false,
  publishDialogOpen: false,
  pendingDelete: null,
  historyPast: [],
  historyFuture: [],
  canUndo: false,
  canRedo: false,
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  isLoading: false,
  error: null,
  validationErrors: [],

  loadCourse: async (courseId: string) => {
    set({ isLoading: true, error: null, courseId });
    try {
      const { fetchCourseStructure } = await import("./api");
      const course = await fetchCourseStructure(courseId);
      set({
        course,
        isLoading: false,
        isDirty: false,
        historyPast: [],
        historyFuture: [],
        canUndo: false,
        canRedo: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load course",
        isLoading: false,
      });
    }
  },

  updateCourseMeta: (patch) =>
    set((s) => {
      if (!s.course) return s;
      return {
        course: { ...s.course, ...patch },
        isDirty: true,
        historyPast: [...s.historyPast, cloneCourse(s.course)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
      };
    }),

  selectTask: (taskId: string | null) => set({ selectedTaskId: taskId }),
  selectLesson: (lessonId: string | null) =>
    set({ selectedLessonId: lessonId }),
  togglePreview: () => set((s) => ({ previewOpen: !s.previewOpen })),
  openPublishDialog: () => set({ publishDialogOpen: true }),
  closePublishDialog: () => set({ publishDialogOpen: false }),
  requestDelete: (type, id, title, lessonId) =>
    set({ pendingDelete: { type, id, title, lessonId } }),
  confirmDelete: () => {
    const { pendingDelete, removeLesson, removeTask } = get();
    if (!pendingDelete) return;
    if (pendingDelete.type === "lesson") {
      removeLesson(pendingDelete.id);
    } else if (pendingDelete.type === "task" && pendingDelete.lessonId) {
      removeTask(pendingDelete.lessonId, pendingDelete.id);
    }
    set({ pendingDelete: null });
  },
  cancelDelete: () => set({ pendingDelete: null }),

  addLesson: () => {
    const { course } = get();
    if (!course) return;
    const newLesson: BuilderLesson = {
      id: null,
      title: "Новый урок",
      description: null,
      orderIndex: course.lessons.length,
      tasks: [],
    };
    set((s) => ({
      course: s.course
        ? { ...s.course, lessons: [...s.course.lessons, newLesson] }
        : s.course,
      isDirty: true,
      historyPast: s.course
        ? [...s.historyPast, cloneCourse(s.course)]
        : s.historyPast,
      historyFuture: s.course ? [] : s.historyFuture,
      canUndo: s.course ? true : s.canUndo,
      canRedo: false,
    }));
  },

  removeLesson: (lessonId: string) => {
    set((s) => ({
      course: s.course
        ? {
            ...s.course,
            lessons: s.course.lessons.filter(
              (l) => l.id !== lessonId && `${l.id}` !== lessonId,
            ),
          }
        : s.course,
      isDirty: true,
      selectedTaskId: null,
      historyPast: s.course
        ? [...s.historyPast, cloneCourse(s.course)]
        : s.historyPast,
      historyFuture: s.course ? [] : s.historyFuture,
      canUndo: s.course ? true : s.canUndo,
      canRedo: false,
    }));
  },

  updateLesson: (
    lessonId: string,
    patch: Partial<Pick<BuilderLesson, "title" | "description">>,
  ) => {
    set((s) => ({
      course: s.course
        ? {
            ...s.course,
            lessons: s.course.lessons.map((l) =>
              l.id === lessonId || `${l.id}` === lessonId
                ? { ...l, ...patch }
                : l,
            ),
          }
        : s.course,
      isDirty: true,
      historyPast: s.course
        ? [...s.historyPast, cloneCourse(s.course)]
        : s.historyPast,
      historyFuture: s.course ? [] : s.historyFuture,
      canUndo: s.course ? true : s.canUndo,
      canRedo: false,
    }));
  },

  reorderLessons: (fromIndex: number, toIndex: number) => {
    set((s) => {
      if (!s.course) return s;
      const lessons = [...s.course.lessons];
      const [moved] = lessons.splice(fromIndex, 1);
      lessons.splice(toIndex, 0, moved);
      return {
        course: {
          ...s.course,
          lessons: lessons.map((l, i) => ({ ...l, orderIndex: i })),
        },
        isDirty: true,
        historyPast: [...s.historyPast, cloneCourse(s.course)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
      };
    });
  },

  addTask: (lessonId: string, taskType: TaskType) => {
    set((s) => {
      if (!s.course) return s;
      return {
        course: {
          ...s.course,
          lessons: s.course.lessons.map((l) => {
            if (l.id !== lessonId && `${l.id}` !== lessonId) return l;
            const newTask: BuilderTask = {
              id: null,
              taskType,
              title: `Новая задача`,
              orderIndex: l.tasks.length,
              required: true,
              payload: defaultPayload(taskType),
            };
            return { ...l, tasks: [...l.tasks, newTask] };
          }),
        },
        isDirty: true,
        historyPast: [...s.historyPast, cloneCourse(s.course)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
      };
    });
  },

  removeTask: (lessonId: string, taskId: string) => {
    set((s) => ({
      course: s.course
        ? {
            ...s.course,
            lessons: s.course.lessons.map((l) =>
              l.id === lessonId || `${l.id}` === lessonId
                ? {
                    ...l,
                    tasks: l.tasks.filter(
                      (t) => t.id !== taskId && `${t.id}` !== taskId,
                    ),
                  }
                : l,
            ),
          }
        : s.course,
      isDirty: true,
      selectedTaskId: s.selectedTaskId === taskId ? null : s.selectedTaskId,
      historyPast: s.course
        ? [...s.historyPast, cloneCourse(s.course)]
        : s.historyPast,
      historyFuture: s.course ? [] : s.historyFuture,
      canUndo: s.course ? true : s.canUndo,
      canRedo: false,
    }));
  },

  duplicateTask: async (lessonId: string, taskId: string) => {
    try {
      const { duplicateTask: apiDuplicate } = await import("./api");
      const result = await apiDuplicate(taskId);
      set((s) => ({
        course: s.course
          ? {
              ...s.course,
              lessons: s.course.lessons.map((l) =>
                l.id === lessonId || `${l.id}` === lessonId
                  ? {
                      ...l,
                      tasks: [
                        ...l.tasks,
                        {
                          id: result.id,
                          taskType: result.task_type as TaskType,
                          title: result.title,
                          orderIndex: result.order_index,
                          required: result.required,
                          payload: result.payload,
                        },
                      ].sort((a, b) => a.orderIndex - b.orderIndex),
                    }
                  : l,
              ),
            }
          : s.course,
        isDirty: true,
        selectedTaskId: result.id,
        historyPast: s.course
          ? [...s.historyPast, cloneCourse(s.course)]
          : s.historyPast,
        historyFuture: s.course ? [] : s.historyFuture,
        canUndo: s.course ? true : s.canUndo,
        canRedo: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to duplicate task",
      });
    }
  },

  updateTask: (
    lessonId: string,
    taskId: string,
    patch: Partial<BuilderTask>,
  ) => {
    set((s) => ({
      course: s.course
        ? {
            ...s.course,
            lessons: s.course.lessons.map((l) =>
              l.id === lessonId || `${l.id}` === lessonId
                ? {
                    ...l,
                    tasks: l.tasks.map((t) =>
                      t.id === taskId || `${t.id}` === taskId
                        ? { ...t, ...patch }
                        : t,
                    ),
                  }
                : l,
            ),
          }
        : s.course,
      isDirty: true,
      historyPast: s.course
        ? [...s.historyPast, cloneCourse(s.course)]
        : s.historyPast,
      historyFuture: s.course ? [] : s.historyFuture,
      canUndo: s.course ? true : s.canUndo,
      canRedo: false,
    }));
  },

  reorderTasks: (lessonId: string, fromIndex: number, toIndex: number) => {
    set((s) => {
      if (!s.course) return s;
      return {
        course: {
          ...s.course,
          lessons: s.course.lessons.map((l) => {
            if (l.id !== lessonId && `${l.id}` !== lessonId) return l;
            const tasks = [...l.tasks];
            const [moved] = tasks.splice(fromIndex, 1);
            tasks.splice(toIndex, 0, moved);
            return {
              ...l,
              tasks: tasks.map((t, i) => ({ ...t, orderIndex: i })),
            };
          }),
        },
        isDirty: true,
        historyPast: [...s.historyPast, cloneCourse(s.course)],
        historyFuture: [],
        canUndo: true,
        canRedo: false,
      };
    });
  },

  save: async () => {
    const { course } = get();
    if (!course) return;

    set({ isSaving: true });
    try {
      const { bulkUpdateStructure } = await import("./api");
      const updated = await bulkUpdateStructure(
        course.id,
        course.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description,
          order_index: l.orderIndex,
          tasks: l.tasks.map((t) => ({
            id: t.id,
            task_type: t.taskType,
            title: t.title,
            order_index: t.orderIndex,
            required: t.required,
            payload: t.payload,
          })),
        })),
      );

      set({
        course: updated,
        isDirty: false,
        isSaving: false,
        lastSavedAt: new Date(),
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to save",
        isSaving: false,
      });
    }
  },

  validate: async () => {
    const { course } = get();
    if (!course) return;

    try {
      const { validateCourse } = await import("./api");
      const result = await validateCourse(course.id);
      set({ validationErrors: result.errors });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Validation failed" });
    }
  },

  publish: async (version: string, changelog?: string) => {
    const { course } = get();
    if (!course) return;

    try {
      const { publishCourse: doPublish } = await import("./api");
      await doPublish(course.id, version, changelog);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Publish failed" });
    }
  },

  rollback: async (releaseId: string, version: string, changelog?: string) => {
    const { course } = get();
    if (!course) return;

    try {
      const { rollbackCourse } = await import("./api");
      await rollbackCourse(course.id, releaseId, version, changelog);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Rollback failed",
      });
    }
  },

  undo: () => {
    set((s) => {
      if (!s.course || s.historyPast.length === 0) return s;
      const previous = s.historyPast[s.historyPast.length - 1];
      const nextPast = s.historyPast.slice(0, -1);
      const nextFuture = [cloneCourse(s.course), ...s.historyFuture];
      return {
        course: cloneCourse(previous),
        historyPast: nextPast,
        historyFuture: nextFuture,
        canUndo: nextPast.length > 0,
        canRedo: nextFuture.length > 0,
        isDirty: true,
      };
    });
  },

  redo: () => {
    set((s) => {
      if (!s.course || s.historyFuture.length === 0) return s;
      const next = s.historyFuture[0];
      const nextFuture = s.historyFuture.slice(1);
      const nextPast = [...s.historyPast, cloneCourse(s.course)];
      return {
        course: cloneCourse(next),
        historyPast: nextPast,
        historyFuture: nextFuture,
        canUndo: nextPast.length > 0,
        canRedo: nextFuture.length > 0,
        isDirty: true,
      };
    });
  },

  reset: () => {
    nextLocalId = 1;
    set({
      courseId: "",
      course: null,
      selectedTaskId: null,
      selectedLessonId: null,
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      isLoading: false,
      error: null,
      validationErrors: [],
      historyPast: [],
      historyFuture: [],
      canUndo: false,
      canRedo: false,
    });
  },
}));
