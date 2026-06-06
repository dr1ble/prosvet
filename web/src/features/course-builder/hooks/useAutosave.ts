import { useEffect, useRef } from "react";

import { useCourseBuilderStore } from "../store";

export function useAutosave(delayMs: number = 2000) {
  const isDirty = useCourseBuilderStore((s) => s.isDirty);
  const isSaving = useCourseBuilderStore((s) => s.isSaving);
  const autosaveTick = useCourseBuilderStore((s) => s.historyPast.length);
  const save = useCourseBuilderStore((s) => s.save);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDirty || isSaving) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setTimeout(() => {
      save();
      timerRef.current = null;
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [autosaveTick, isDirty, isSaving, delayMs, save]);
}
