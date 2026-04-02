"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateCourseStatus } from "@/features/catalog/api";
import type { CourseStatus } from "@/features/catalog/types";

type CourseStatusToggleButtonProps = {
  courseId: string;
  status: CourseStatus;
  archiveLabel: string;
  restoreLabel: string;
  className: string;
  contentClassName: string;
  iconClassName: string;
};

export function CourseStatusToggleButton({
  courseId,
  status,
  archiveLabel,
  restoreLabel,
  className,
  contentClassName,
  iconClassName,
}: CourseStatusToggleButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const nextStatus: CourseStatus = status === "archived" ? "draft" : "archived";
  const label = status === "archived" ? restoreLabel : archiveLabel;

  async function onToggle() {
    if (pending) {
      return;
    }

    setPending(true);
    try {
      await updateCourseStatus(courseId, nextStatus);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось обновить статус курса";
      window.alert(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      className={className}
      type="button"
      onClick={onToggle}
      disabled={pending}
    >
      <span className={contentClassName}>
        <span className={iconClassName} aria-hidden="true">
          {status === "archived" ? (
            <svg viewBox="0 0 20 20" fill="none" role="presentation">
              <path
                d="M10 3v14M10 3l5 5M10 3L5 8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="none" role="presentation">
              <path
                d="M3.5 6.5h13v10h-13z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M7 9.5h6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M8.5 3.5h3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>
        <span>{pending ? "..." : label}</span>
      </span>
    </button>
  );
}
