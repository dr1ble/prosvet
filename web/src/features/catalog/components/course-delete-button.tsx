"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteCourse } from "@/features/catalog/api";

type CourseDeleteButtonProps = {
  courseId: string;
  label: string;
  className: string;
  contentClassName: string;
  iconClassName: string;
};

export function CourseDeleteButton({
  courseId,
  label,
  className,
  contentClassName,
  iconClassName,
}: CourseDeleteButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (pending) return;

    const confirmed = window.confirm(
      "Удалить архивный курс полностью? Это действие нельзя отменить.",
    );
    if (!confirmed) return;

    setPending(true);
    try {
      await deleteCourse(courseId);
      router.push("/catalog");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось удалить курс";
      window.alert(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleDelete}
      disabled={pending}
    >
      <span className={contentClassName}>
        <span className={iconClassName} aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none" role="presentation">
            <path
              d="M4.5 6h11"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M7.5 6V4.6h5V6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6.2 6.8V15a1 1 0 0 0 1 1h5.6a1 1 0 0 0 1-1V6.8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M8.6 9.2v4.2M11.4 9.2v4.2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span>{pending ? "..." : label}</span>
      </span>
    </button>
  );
}
