"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

import { CourseBuilderLayout } from "@/features/course-builder/ui/CourseBuilderLayout";
import { useCourseBuilderStore } from "@/features/course-builder/store";
import { useAutosave } from "@/features/course-builder/hooks/useAutosave";

export default function CourseBuilderPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const loadCourse = useCourseBuilderStore((s) => s.loadCourse);
  const isLoading = useCourseBuilderStore((s) => s.isLoading);
  const error = useCourseBuilderStore((s) => s.error);

  useAutosave(2000);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const target = e.target as HTMLElement | null;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        Boolean(target?.isContentEditable);

      if (mod && e.key === "s") {
        e.preventDefault();
        useCourseBuilderStore.getState().save();
      }

      if (mod && !isEditable && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          useCourseBuilderStore.getState().redo();
        } else {
          useCourseBuilderStore.getState().undo();
        }
      }

      if (mod && !isMac && !isEditable && e.key.toLowerCase() === "y") {
        e.preventDefault();
        useCourseBuilderStore.getState().redo();
      }

      if (e.key === "Escape") {
        useCourseBuilderStore.getState().cancelDelete();
        useCourseBuilderStore.getState().closePublishDialog();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (courseId) {
      loadCourse(courseId);
    }
    return () => {
      useCourseBuilderStore.getState().reset();
    };
  }, [courseId, loadCourse]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <p>Загрузка курса...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <p style={{ color: "#dc3545" }}>Ошибка: {error}</p>
      </div>
    );
  }

  return <CourseBuilderLayout />;
}
