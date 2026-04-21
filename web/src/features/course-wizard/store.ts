import { create } from "zustand";

import type {
  WizardCourseInfo,
  WizardLesson,
  WizardModule,
  WizardStep,
} from "./types";

let nextId = 1;
function genId(): string {
  return String(nextId++);
}

export interface WizardState {
  currentStep: WizardStep;
  courseId: string | null;
  info: WizardCourseInfo;
  lessons: WizardLesson[];
  modules: WizardModule[];
  saving: boolean;
  lastSaved: Date | null;
  error: string | null;

  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  setCourseId: (id: string) => void;
  setInfo: (patch: Partial<WizardCourseInfo>) => void;

  addLesson: (title?: string) => string;
  updateLesson: (
    localId: string,
    patch: Partial<Pick<WizardLesson, "title" | "description">>,
  ) => void;
  removeLesson: (localId: string) => void;
  setLessonServerId: (localId: string, serverId: string) => void;

  addModule: (
    lessonLocalId: string,
    taskType: WizardModule["taskType"],
  ) => string;
  updateModule: (
    localId: string,
    patch: Partial<Pick<WizardModule, "title" | "payload">>,
  ) => void;
  removeModule: (localId: string) => void;
  setModuleServerId: (localId: string, serverId: string) => void;

  setSaving: (v: boolean) => void;
  setLastSaved: (d: Date | null) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

import { STEP_ORDER } from "./types";

const initialState = {
  currentStep: "info" as WizardStep,
  courseId: null as string | null,
  info: { title: "", slug: "", description: "" } as WizardCourseInfo,
  lessons: [] as WizardLesson[],
  modules: [] as WizardModule[],
  saving: false,
  lastSaved: null as Date | null,
  error: null as string | null,
};

export const useWizardStore = create<WizardState>((set, get) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),
  nextStep: () => {
    const idx = STEP_ORDER.indexOf(get().currentStep);
    if (idx < STEP_ORDER.length - 1) set({ currentStep: STEP_ORDER[idx + 1] });
  },
  prevStep: () => {
    const idx = STEP_ORDER.indexOf(get().currentStep);
    if (idx > 0) set({ currentStep: STEP_ORDER[idx - 1] });
  },

  setCourseId: (id) => set({ courseId: id }),
  setInfo: (patch) => set((s) => ({ info: { ...s.info, ...patch } })),

  addLesson: (title) => {
    const id = genId();
    const order = get().lessons.length;
    set((s) => ({
      lessons: [
        ...s.lessons,
        {
          localId: id,
          serverId: null,
          title: title ?? "",
          description: "",
          order,
        },
      ],
    }));
    return id;
  },
  updateLesson: (localId, patch) =>
    set((s) => ({
      lessons: s.lessons.map((l) =>
        l.localId === localId ? { ...l, ...patch } : l,
      ),
    })),
  removeLesson: (localId) =>
    set((s) => ({
      lessons: s.lessons.filter((l) => l.localId !== localId),
      modules: s.modules.filter((m) => m.lessonLocalId !== localId),
    })),
  setLessonServerId: (localId, serverId) =>
    set((s) => ({
      lessons: s.lessons.map((l) =>
        l.localId === localId ? { ...l, serverId } : l,
      ),
    })),

  addModule: (lessonLocalId, taskType) => {
    const id = genId();
    const order = get().modules.filter(
      (m) => m.lessonLocalId === lessonLocalId,
    ).length;
    const payload = defaultPayload(taskType);
    set((s) => ({
      modules: [
        ...s.modules,
        {
          localId: id,
          serverId: null,
          lessonLocalId,
          taskType,
          title: "",
          order,
          payload,
        },
      ],
    }));
    return id;
  },
  updateModule: (localId, patch) =>
    set((s) => ({
      modules: s.modules.map((m) =>
        m.localId === localId ? { ...m, ...patch } : m,
      ),
    })),
  removeModule: (localId) =>
    set((s) => ({
      modules: s.modules.filter((m) => m.localId !== localId),
    })),
  setModuleServerId: (localId, serverId) =>
    set((s) => ({
      modules: s.modules.map((m) =>
        m.localId === localId ? { ...m, serverId } : m,
      ),
    })),

  setSaving: (v) => set({ saving: v }),
  setLastSaved: (d) => set({ lastSaved: d }),
  setError: (e) => set({ error: e }),
  reset: () => {
    nextId = 1;
    set(initialState);
  },
}));

function defaultPayload(taskType: string): Record<string, unknown> {
  switch (taskType) {
    case "theory_text":
      return { content: "" };
    case "theory_video":
      return { video_url: "", duration: 0 };
    case "quiz":
      return { questions: [] };
    case "simulation":
      return { config: {} };
    case "cheat_sheet":
      return { content: "" };
    default:
      return {};
  }
}
