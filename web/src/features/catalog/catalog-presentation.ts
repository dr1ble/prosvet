import type { CourseDto, CourseReleaseDto } from "@/features/catalog/types";
import type { UiMessages } from "@/shared/i18n/messages";

type CatalogStatus = CourseDto["status"] | CourseReleaseDto["status"];

export function statusClass(
  status: CatalogStatus,
  styles: Record<string, string>,
): string {
  if (status === "active" || status === "published") {
    return `${styles.statusTag} ${styles.statusActive}`;
  }
  if (status === "draft") {
    return `${styles.statusTag} ${styles.statusDraft}`;
  }
  return `${styles.statusTag} ${styles.statusArchived}`;
}

export function statusLabel(
  status: CatalogStatus,
  messages: UiMessages,
): string {
  if (status === "active") {
    return messages.catalog.statusActive;
  }
  if (status === "draft") {
    return messages.catalog.statusDraft;
  }
  if (status === "published") {
    return messages.catalog.statusPublished;
  }
  return messages.catalog.statusArchived;
}
