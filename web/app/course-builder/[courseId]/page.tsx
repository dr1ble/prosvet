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
