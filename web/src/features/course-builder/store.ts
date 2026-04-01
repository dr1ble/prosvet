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
  updateTask: (
    lessonId: string,
    taskId: string,
    patch: Partial<BuilderTask>,
  ) => void;
  reorderTasks: (lessonId: string, fromIndex: number, toIndex: number) => void;

  save: () => Promise<void>;
  validate: () => Promise<void>;
  publish: (version: string, changelog?: string) => Promise<void>;

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
      set({ course, isLoading: false, isDirty: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load course",
        isLoading: false,
      });
    }
  },

  updateCourseMeta: (patch) =>
    set((s) => ({
      course: s.course ? { ...s.course, ...patch } : s.course,
      isDirty: true,
    })),

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
    }));
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
    });
  },
}));
