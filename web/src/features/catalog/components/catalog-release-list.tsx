import {
  statusClass,
  statusLabel,
} from "@/features/catalog/catalog-presentation";
import type { CourseDto, CourseReleaseDto } from "@/features/catalog/types";
import type { UiMessages } from "@/shared/i18n/messages";
import { SurfaceCard } from "@/shared/ui/surface-card";

type CatalogReleaseListProps = {
  selectedCourse: CourseDto | null;
  releaseError: string | null;
  releases: CourseReleaseDto[];
  locale: string;
  messages: UiMessages;
  styles: Record<string, string>;
};

export function CatalogReleaseList({
  selectedCourse,
  releaseError,
  releases,
  locale,
  messages,
  styles,
}: CatalogReleaseListProps) {
  if (!selectedCourse) {
    return (
      <SurfaceCard className={styles.empty} tone="muted">
        {messages.catalog.chooseCourse}
      </SurfaceCard>
    );
  }

  if (releaseError) {
    return (
      <SurfaceCard className={`${styles.empty} ${styles.error}`} tone="muted">
        {releaseError}
      </SurfaceCard>
    );
  }

  if (releases.length === 0) {
    return (
      <SurfaceCard className={styles.empty} tone="muted">
        {messages.catalog.noReleases}
      </SurfaceCard>
    );
  }

  return (
    <div className={styles.releaseList}>
      {releases.map((release) => (
        <SurfaceCard
          as="article"
          key={release.id}
          className={styles.releaseItem}
        >
          <div className={styles.releaseTop}>
            <strong className={styles.releaseVersion}>
              v{release.version}
            </strong>
            <span className={statusClass(release.status, styles)}>
              {statusLabel(release.status, messages)}
            </span>
          </div>

          <div className={styles.releaseMeta}>
            {release.published_at && (
              <span className={styles.releaseMetaStrong}>
                {messages.catalog.publishedAt}:{" "}
                {new Date(release.published_at).toLocaleString(locale)}
              </span>
            )}
            <span className={styles.releaseMetaSoft}>
              {messages.catalog.createdAt}:{" "}
              {new Date(release.created_at).toLocaleString(locale)}
              {" · "}
              {messages.catalog.screens}: {release.screen_count}
            </span>
          </div>
          {release.changelog && (
            <p className={styles.releaseNote}>{release.changelog}</p>
          )}
        </SurfaceCard>
      ))}
    </div>
  );
}
