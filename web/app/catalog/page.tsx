import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { fetchAdminAuthMeServer } from "@/features/auth/server";
import { fetchCourseReleases, fetchCourses } from "@/features/catalog/api";
import { buildCatalogHref } from "@/features/catalog/catalog-navigation";
import { CatalogReleaseList } from "@/features/catalog/components/catalog-release-list";
import { CatalogSidebar } from "@/features/catalog/components/catalog-sidebar";
import { CourseDeleteButton } from "@/features/catalog/components/course-delete-button";
import { CourseStatusToggleButton } from "@/features/catalog/components/course-status-toggle-button";
import type { CourseDto, CourseReleaseDto } from "@/features/catalog/types";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { formatLocale, resolveLanguage } from "@/shared/i18n/lang";
import { getUiMessages } from "@/shared/i18n/messages";
import { ActionButton } from "@/shared/ui/action-button";
import { ActionLink } from "@/shared/ui/action-link";

import styles from "./catalog.module.css";

const DEFAULT_RELEASE_LIMIT = 50;
const MIN_RELEASE_LIMIT = 1;
const MAX_RELEASE_LIMIT = 200;

type CatalogWorkspaceTab = "versions";

type CatalogPageProps = {
  searchParams: Promise<{
    courseId?: string;
    releaseStatus?: string;
    releaseVersion?: string;
    releaseLimit?: string;
    tab?: string;
    lang?: string;
  }>;
};

function parseReleaseStatus(
  value: string | undefined,
): CourseReleaseDto["status"] | undefined {
  if (value === "draft" || value === "published") {
    return value;
  }
  return undefined;
}

function parseReleaseLimit(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed)) {
    return DEFAULT_RELEASE_LIMIT;
  }
  if (parsed < MIN_RELEASE_LIMIT) {
    return MIN_RELEASE_LIMIT;
  }
  if (parsed > MAX_RELEASE_LIMIT) {
    return MAX_RELEASE_LIMIT;
  }
  return parsed;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const language = resolveLanguage(params.lang);
  const nextSearchParams = new URLSearchParams({ lang: language });
  if (params.courseId) {
    nextSearchParams.set("courseId", params.courseId);
  }
  if (params.releaseStatus) {
    nextSearchParams.set("releaseStatus", params.releaseStatus);
  }
  if (params.releaseVersion) {
    nextSearchParams.set("releaseVersion", params.releaseVersion);
  }
  if (params.releaseLimit) {
    nextSearchParams.set("releaseLimit", params.releaseLimit);
  }
  const refreshRedirectHref = buildRefreshRedirectHref(
    `/catalog?${nextSearchParams.toString()}`,
    language,
  );
  const messages = getUiMessages(language);
  const locale = formatLocale(language);

  const releaseStatus = parseReleaseStatus(params.releaseStatus);
  const releaseVersion = params.releaseVersion?.trim() ?? "";
  const releaseLimit = parseReleaseLimit(params.releaseLimit);
  const workspaceTab: CatalogWorkspaceTab = "versions";

  const cookieStore = await cookies();
  const adminAccessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value ?? "";
  if (!adminAccessToken) {
    redirect(refreshRedirectHref);
  }
  let profile: Awaited<ReturnType<typeof fetchAdminAuthMeServer>>;
  try {
    profile = await fetchAdminAuthMeServer(adminAccessToken);
  } catch {
    redirect(refreshRedirectHref);
  }

  let courses: CourseDto[] = [];
  let coursesError: string | null = null;

  try {
    courses = await fetchCourses(adminAccessToken);
    if (profile.role === "methodologist") {
      courses = courses.filter(
        (course) => course.author_id === profile.user_id,
      );
    }
  } catch (error) {
    coursesError =
      error instanceof Error
        ? error.message
        : messages.catalog.loadCoursesErrorFallback;
  }

  const selectedCourse =
    courses.find((course) => course.id === params.courseId) ??
    courses.at(0) ??
    null;

  let releases: CourseReleaseDto[] = [];
  let releaseError: string | null = null;

  if (selectedCourse && adminAccessToken) {
    try {
      releases = await fetchCourseReleases(
        selectedCourse.id,
        adminAccessToken,
        {
          status: releaseStatus,
          versionQuery: releaseVersion || undefined,
          limit: releaseLimit,
        },
      );
    } catch (error) {
      releaseError =
        error instanceof Error
          ? error.message
          : messages.catalog.loadReleasesErrorFallback;
    }
  }

  const selectedCourseId = selectedCourse?.id ?? null;

  const dashboardHref = `/dashboard?lang=${language}`;
  const backAriaLabel =
    language === "ru" ? "Назад к рабочему столу" : "Back to dashboard";
  const versionsFoundLabel =
    language === "ru" ? "Найдено версий" : "Versions found";
  const releaseCount = releases.length;

  const createCourseLabel =
    language === "ru" ? "Создать курс" : "Create course";
  const editCourseLabel =
    language === "ru" ? "Редактировать курс" : "Edit course";
  const archiveCourseLabel =
    language === "ru" ? "Архивировать курс" : "Archive course";
  const restoreCourseLabel =
    language === "ru" ? "Восстановить курс" : "Restore course";
  const deleteCourseLabel =
    language === "ru" ? "Удалить курс" : "Delete course";
  const versionsHint =
    language === "ru"
      ? "Здесь отображаются все версии выбранного курса."
      : "All versions of the selected course are shown here.";
  const actionsMenuLabel = language === "ru" ? "Действия" : "Actions";
  const filteredByVersionLabel = language === "ru" ? "Версия" : "Version";
  const filteredByStatusLabel = language === "ru" ? "Статус" : "Status";
  const updatedPrefix = language === "ru" ? "Обновлен" : "Updated";
  const selectedCourseUpdated = selectedCourse
    ? new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(selectedCourse.updated_at))
    : null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.titleRow}>
            <Link
              className={styles.backIconLink}
              href={dashboardHref}
              aria-label={backAriaLabel}
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                role="presentation"
                aria-hidden="true"
              >
                <path
                  d="M11.8 4.6 6.4 10l5.4 5.4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <h1 className={styles.title}>{messages.catalog.title}</h1>
          </div>
          <p className={styles.subtitle}>{messages.catalog.subtitle}</p>
        </div>
        <div className={styles.headerActions}>
          <ActionLink
            className={styles.headerCreateCourse}
            href="/course-builder/new"
            variant="primary"
          >
            <span className={styles.actionContent}>
              <span className={styles.actionIcon} aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" role="presentation">
                  <path
                    d="M10 4v12M4 10h12"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span>{createCourseLabel}</span>
            </span>
          </ActionLink>
        </div>
      </header>

      <section className={styles.workspace}>
        <CatalogSidebar
          courses={courses}
          coursesError={coursesError}
          selectedCourseId={selectedCourseId}
          language={language}
          tab={workspaceTab}
          releaseStatus={releaseStatus}
          releaseVersion={releaseVersion}
          releaseLimit={releaseLimit}
          messages={messages}
          styles={styles}
        />

        <section className={styles.content}>
          <>
            <div className={styles.releaseHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  {selectedCourse
                    ? `${messages.catalog.releasePrefix}: ${selectedCourse.title}`
                    : messages.catalog.releasesTitle}
                </h2>
                <p className={styles.releaseSupportText}>{versionsHint}</p>
              </div>
              <div className={styles.releaseHeaderMeta}>
                <div className={styles.releaseMetaGroup}>
                  <span className={styles.metaBadge}>
                    {versionsFoundLabel}: {releaseCount}
                  </span>
                  {selectedCourseUpdated ? (
                    <span className={styles.metaSubtle}>
                      {updatedPrefix}: {selectedCourseUpdated}
                    </span>
                  ) : null}
                </div>
                {selectedCourse ? (
                  <div className={styles.releaseActionsGroup}>
                    <Link
                      className={styles.inlineEditLink}
                      href={`/course-builder/${selectedCourse.id}`}
                    >
                      <span className={styles.actionContent}>
                        <span className={styles.actionIcon} aria-hidden="true">
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            role="presentation"
                          >
                            <path
                              d="M4 14.5V16h1.5L14 7.5 12.5 6 4 14.5Z"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M11.8 6.3 13.3 4.8a1 1 0 0 1 1.4 0l.5.5a1 1 0 0 1 0 1.4L13.7 8.2"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <span>{editCourseLabel}</span>
                      </span>
                    </Link>
                    <details className={styles.actionsMenu}>
                      <summary
                        className={styles.actionsMenuTrigger}
                        aria-label="Больше действий"
                      >
                        <span className={styles.actionsMenuLabel}>
                          {actionsMenuLabel}
                        </span>
                        <span className={styles.actionIcon} aria-hidden="true">
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            role="presentation"
                          >
                            <path
                              d="M6 8l4 4 4-4"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </summary>
                      <div className={styles.actionsMenuPanel}>
                        <CourseStatusToggleButton
                          className={styles.menuActionButton}
                          contentClassName={styles.actionContent}
                          iconClassName={styles.actionIcon}
                          errorClassName={styles.actionsMenuError}
                          courseId={selectedCourse.id}
                          status={selectedCourse.status}
                          archiveLabel={archiveCourseLabel}
                          restoreLabel={restoreCourseLabel}
                        />
                        {selectedCourse.status === "archived" ? (
                          <CourseDeleteButton
                            className={styles.menuDeleteButton}
                            contentClassName={styles.actionContent}
                            iconClassName={styles.actionIcon}
                            errorClassName={styles.actionsMenuError}
                            courseId={selectedCourse.id}
                            label={deleteCourseLabel}
                          />
                        ) : null}
                      </div>
                    </details>
                  </div>
                ) : null}
              </div>
            </div>

            {selectedCourse && (
              <form className={styles.releaseFilters} method="get">
                <input
                  type="hidden"
                  name="courseId"
                  value={selectedCourse.id}
                />
                <input type="hidden" name="lang" value={language} />
                <input type="hidden" name="tab" value="versions" />
                <label className={styles.filterField}>
                  <span>{messages.catalog.filterStatus}</span>
                  <select
                    className={styles.filterInput}
                    name="releaseStatus"
                    defaultValue={releaseStatus ?? ""}
                  >
                    <option value="">{messages.catalog.filterAll}</option>
                    <option value="draft">
                      {messages.catalog.statusDraft}
                    </option>
                    <option value="published">
                      {messages.catalog.statusPublished}
                    </option>
                  </select>
                </label>
                <label className={styles.filterField}>
                  <span>{messages.catalog.filterVersion}</span>
                  <input
                    className={styles.filterInput}
                    name="releaseVersion"
                    defaultValue={releaseVersion}
                    placeholder={
                      language === "ru" ? "например, 1.0" : "e.g. 1.0"
                    }
                  />
                </label>
                <label className={styles.filterField}>
                  <span>{messages.catalog.filterLimit}</span>
                  <select
                    className={styles.filterInput}
                    name="releaseLimit"
                    defaultValue={String(releaseLimit)}
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </label>
                <div className={styles.filterActions}>
                  <ActionButton
                    className={styles.filterButton}
                    type="submit"
                    variant="primary"
                  >
                    <span className={styles.actionContent}>
                      <span className={styles.actionIcon} aria-hidden="true">
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          role="presentation"
                        >
                          <path
                            d="m4.5 10.5 3.2 3.2 7.8-7.8"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span>{messages.catalog.filterApply}</span>
                    </span>
                  </ActionButton>
                  <ActionLink
                    className={styles.filterReset}
                    href={buildCatalogHref({
                      courseId: selectedCourse.id,
                      tab: "versions",
                      language,
                    })}
                    variant="ghost"
                  >
                    <span className={styles.actionContent}>
                      <span className={styles.actionIcon} aria-hidden="true">
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          role="presentation"
                        >
                          <path
                            d="M4.5 9a5.5 5.5 0 1 1 1.6 4"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                          <path
                            d="M4.5 5.5V9h3.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span>{messages.catalog.filterReset}</span>
                    </span>
                  </ActionLink>
                </div>
                {(releaseStatus || releaseVersion) && (
                  <div className={styles.activeFilters}>
                    {releaseStatus && (
                      <span className={styles.activeFilterChip}>
                        {filteredByStatusLabel}:{" "}
                        {releaseStatus === "published"
                          ? messages.catalog.statusPublished
                          : messages.catalog.statusDraft}
                      </span>
                    )}
                    {releaseVersion && (
                      <span className={styles.activeFilterChip}>
                        {filteredByVersionLabel}: {releaseVersion}
                      </span>
                    )}
                  </div>
                )}
              </form>
            )}

            <section className={styles.releasesPanel}>
              <CatalogReleaseList
                selectedCourse={selectedCourse}
                releaseError={releaseError}
                releases={releases}
                locale={locale}
                messages={messages}
                styles={styles}
              />
            </section>
          </>
        </section>
      </section>
    </main>
  );
}
