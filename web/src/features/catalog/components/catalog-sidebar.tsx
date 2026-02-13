import Link from "next/link";

import { buildCatalogHref } from "@/features/catalog/catalog-navigation";
import {
  statusClass,
  statusLabel,
} from "@/features/catalog/catalog-presentation";
import type { CourseDto, CourseReleaseDto } from "@/features/catalog/types";
import type { AppLanguage } from "@/shared/i18n/lang";
import type { UiMessages } from "@/shared/i18n/messages";
import { SurfaceCard } from "@/shared/ui/surface-card";

type CatalogSidebarProps = {
  courses: CourseDto[];
  coursesError: string | null;
  selectedCourseId: string | null;
  language: AppLanguage;
  tab: "versions" | "builder";
  releaseStatus?: CourseReleaseDto["status"];
  releaseVersion?: string;
  releaseLimit?: number;
  messages: UiMessages;
  styles: Record<string, string>;
};

export function CatalogSidebar({
  courses,
  coursesError,
  selectedCourseId,
  language,
  tab,
  releaseStatus,
  releaseVersion,
  releaseLimit,
  messages,
  styles,
}: CatalogSidebarProps) {
  return (
    <SurfaceCard as="aside" className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>{messages.catalog.coursesTitle}</h2>
        <span className={styles.countBadge}>{courses.length}</span>
      </div>
      {coursesError ? (
        <SurfaceCard className={`${styles.empty} ${styles.error}`} tone="muted">
          {coursesError}
        </SurfaceCard>
      ) : courses.length === 0 ? (
        <SurfaceCard className={styles.empty} tone="muted">
          {messages.catalog.noCourses}
        </SurfaceCard>
      ) : (
        <ul className={styles.courseList}>
          {courses.map((course) => {
            const active = selectedCourseId === course.id;
            return (
              <li key={course.id}>
                <Link
                  href={buildCatalogHref({
                    courseId: course.id,
                    releaseStatus,
                    releaseVersion,
                    releaseLimit,
                    tab,
                    language,
                  })}
                  className={`${styles.courseItem} ${active ? styles.courseItemActive : ""}`}
                >
                  <p className={styles.courseTitle}>{course.title}</p>
                  <div className={styles.courseMetaRow}>
                    <span className={styles.courseSlug}>{course.slug}</span>
                    <span className={statusClass(course.status, styles)}>
                      {statusLabel(course.status, messages)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </SurfaceCard>
  );
}
