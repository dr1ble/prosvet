"use client";

import { useEffect, useRef } from "react";

import { useWizardStore } from "./store";
import * as api from "./api";

export function useAutoSave(courseId: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setSaving = useWizardStore((s) => s.setSaving);
  const setLastSaved = useWizardStore((s) => s.setLastSaved);
  const setError = useWizardStore((s) => s.setError);

  const save = async () => {
    const state = useWizardStore.getState();
    if (!courseId || courseId === "new") return;

    setSaving(true);
    setError(null);
    try {
      if (state.info.title) {
        await api.updateCourse(courseId, {
          title: state.info.title,
          description: state.info.description || undefined,
        });
      }

      for (const lesson of state.lessons) {
        if (lesson.serverId) {
          await api.updateCourseLesson(lesson.serverId, {
            title: lesson.title,
            description: lesson.description || null,
            status: "draft",
          });
        } else {
          const created = await api.createCourseLesson(courseId, {
            title: lesson.title,
            description: lesson.description || null,
          });
          useWizardStore
            .getState()
            .setLessonServerId(lesson.localId, created.id);
        }
      }

      for (const mod of state.modules) {
        const lesson = state.lessons.find(
          (l) => l.localId === mod.lessonLocalId,
        );
        if (!lesson?.serverId) continue;

        if (mod.serverId) {
          await api.updateLessonTask(mod.serverId, {
            title: mod.title,
            payload: mod.payload,
          });
        } else {
          const created = await api.createLessonTask(lesson.serverId, {
            task_type: mod.taskType,
            title: mod.title,
            payload: mod.payload,
          });
          useWizardStore.getState().setModuleServerId(mod.localId, created.id);
        }
      }

      setLastSaved(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const debounceSave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void save(), 1500);
  };

  return debounceSave;
}

export function useAutoSaveEffect(courseId: string) {
  const debounceSave = useAutoSave(courseId);
  const lessons = useWizardStore((s) => s.lessons);
  const modules = useWizardStore((s) => s.modules);
  const info = useWizardStore((s) => s.info);

  useEffect(() => {
    if (courseId && courseId !== "new") {
      debounceSave();
    }
  }, [lessons, modules, info, courseId, debounceSave]);
}
