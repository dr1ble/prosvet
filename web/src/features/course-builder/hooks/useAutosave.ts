import { useEffect, useRef } from "react";

import { useCourseBuilderStore } from "../store";

export function useAutosave(delayMs: number = 2000) {
  const isDirty = useCourseBuilderStore((s) => s.isDirty);
  const save = useCourseBuilderStore((s) => s.save);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDirty) {
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
  }, [isDirty, delayMs, save]);
}
