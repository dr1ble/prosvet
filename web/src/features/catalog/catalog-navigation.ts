import type { CourseReleaseDto } from "@/features/catalog/types";
import type { AppLanguage } from "@/shared/i18n/lang";

const DEFAULT_RELEASE_LIMIT = 50;

export type CatalogHrefParams = {
  courseId?: string | null;
  releaseStatus?: CourseReleaseDto["status"];
  releaseVersion?: string;
  releaseLimit?: number;
  tab?: "versions" | "builder";
  language: AppLanguage;
};

export function buildCatalogHref({
  courseId,
  releaseStatus,
  releaseVersion,
  releaseLimit,
  tab,
  language,
}: CatalogHrefParams): string {
  const params = new URLSearchParams();

  if (courseId) {
    params.set("courseId", courseId);
  }
  if (releaseStatus) {
    params.set("releaseStatus", releaseStatus);
  }

  const normalizedVersion = releaseVersion?.trim();
  if (normalizedVersion) {
    params.set("releaseVersion", normalizedVersion);
  }
  if (releaseLimit && releaseLimit !== DEFAULT_RELEASE_LIMIT) {
    params.set("releaseLimit", String(releaseLimit));
  }
  if (tab === "builder") {
    params.set("tab", "builder");
  }

  params.set("lang", language);
  return `/catalog?${params.toString()}`;
}
