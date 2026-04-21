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
  if (status === "pending_review") {
    return `${styles.statusTag} ${styles.statusPending}`;
  }
  if (status === "approved") {
    return `${styles.statusTag} ${styles.statusApproved}`;
  }
  if (status === "rejected") {
    return `${styles.statusTag} ${styles.statusRejected}`;
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
  if (status === "pending_review") {
    return messages.moderation.pendingReview;
  }
  if (status === "approved") {
    return messages.moderation.approved;
  }
  if (status === "rejected") {
    return messages.moderation.rejected;
  }
  return messages.catalog.statusArchived;
}
