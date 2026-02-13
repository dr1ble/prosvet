import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { fetchAdminAuthMeServer } from "@/features/auth/server";
import { fetchCourseReleases, fetchCourses } from "@/features/catalog/api";
import { buildCatalogHref } from "@/features/catalog/catalog-navigation";
import { CatalogReleaseList } from "@/features/catalog/components/catalog-release-list";
import { CatalogSidebar } from "@/features/catalog/components/catalog-sidebar";
import { CatalogWritePanel } from "@/features/catalog/components/catalog-write-panel";
import type { CourseDto, CourseReleaseDto } from "@/features/catalog/types";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { formatLocale, resolveLanguage } from "@/shared/i18n/lang";
import { getUiMessages } from "@/shared/i18n/messages";
import { ActionButton } from "@/shared/ui/action-button";
import { ActionLink } from "@/shared/ui/action-link";
import { LanguageSwitch } from "@/shared/ui/language-switch";
import { SurfaceCard } from "@/shared/ui/surface-card";

import styles from "./catalog.module.css";

const DEFAULT_RELEASE_LIMIT = 50;
const MIN_RELEASE_LIMIT = 1;
const MAX_RELEASE_LIMIT = 200;

type CatalogWorkspaceTab = "versions" | "builder";

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

function parseCatalogTab(value: string | undefined): CatalogWorkspaceTab {
  if (value === "builder") {
    return "builder";
  }
  return "versions";
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
  if (params.tab) {
    nextSearchParams.set("tab", params.tab);
  }
  const refreshRedirectHref = buildRefreshRedirectHref(
    `/catalog?${nextSearchParams.toString()}`,
    language,
  );
  const messages = getUiMessages(language);
  const locale = formatLocale(language);

  let courses: CourseDto[] = [];
  let coursesError: string | null = null;

  try {
    courses = await fetchCourses();
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

  const releaseStatus = parseReleaseStatus(params.releaseStatus);
  const releaseVersion = params.releaseVersion?.trim() ?? "";
  const releaseLimit = parseReleaseLimit(params.releaseLimit);
  const workspaceTab = parseCatalogTab(params.tab);

  const cookieStore = await cookies();
  const adminAccessToken =
    cookieStore.get(ADMIN_ACCESS_COOKIE)?.value ??
    process.env.WEB_ADMIN_ACCESS_TOKEN ??
    "";
  if (!adminAccessToken) {
    redirect(refreshRedirectHref);
  }
  try {
    await fetchAdminAuthMeServer(adminAccessToken);
  } catch {
    redirect(refreshRedirectHref);
  }

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

  const baseHrefParams = {
    courseId: selectedCourseId,
    releaseStatus,
    releaseVersion,
    releaseLimit,
  };

  const ruHref = buildCatalogHref({
    ...baseHrefParams,
    tab: workspaceTab,
    language: "ru",
  });
  const enHref = buildCatalogHref({
    ...baseHrefParams,
    tab: workspaceTab,
    language: "en",
  });
  const versionsTabHref = buildCatalogHref({
    ...baseHrefParams,
    tab: "versions",
    language,
  });
  const builderTabHref = buildCatalogHref({
    ...baseHrefParams,
    tab: "builder",
    language,
  });

  const dashboardHref = `/dashboard?lang=${language}`;
  const dashboardLabel = language === "ru" ? "Панель" : "Dashboard";
  const totalCoursesLabel =
    language === "ru" ? "Всего курсов" : "Total courses";
  const selectedCourseLabel =
    language === "ru" ? "Выбранный курс" : "Selected course";
  const totalVersionsLabel =
    language === "ru" ? "Найдено версий" : "Versions found";
  const catalogKicker = language === "ru" ? "Каталог" : "Catalog";
  const releaseCount = releases.length;

  const versionsTabLabel =
    language === "ru" ? "Версии курса" : "Course versions";
  const builderTabLabel =
    language === "ru" ? "Конструктор курса" : "Course builder";
  const openBuilderLabel =
    language === "ru" ? "Открыть конструктор" : "Open builder";
  const builderTitle =
    language === "ru"
      ? "Конструктор курса и версии"
      : "Course and version builder";
  const builderHint =
    language === "ru"
      ? "Создайте курс, затем формируйте версии для мобильного приложения в одном рабочем блоке."
      : "Create a course first, then prepare app-ready versions in one focused workspace.";
  const versionsHint =
    language === "ru"
      ? "Здесь отображаются все версии выбранного курса."
      : "All versions of the selected course are shown here.";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <p className={styles.kicker}>{catalogKicker}</p>
          <h1 className={styles.title}>{messages.catalog.title}</h1>
          <p className={styles.subtitle}>{messages.catalog.subtitle}</p>
        </div>
        <div className={styles.headerActions}>
          <ActionLink
            className={styles.dashboardLink}
            href={dashboardHref}
            variant="secondary"
          >
            {dashboardLabel}
          </ActionLink>
          <LanguageSwitch
            currentLanguage={language}
            ruHref={ruHref}
            enHref={enHref}
            label={messages.languageLabel}
          />
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
          <section className={styles.summaryGrid}>
            <SurfaceCard as="article" className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{totalCoursesLabel}</p>
              <p className={styles.summaryValue}>{courses.length}</p>
            </SurfaceCard>
            <SurfaceCard as="article" className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{selectedCourseLabel}</p>
              <p className={styles.summaryValueText}>
                {selectedCourse?.title ?? messages.catalog.chooseCourse}
              </p>
            </SurfaceCard>
            <SurfaceCard as="article" className={styles.summaryCard}>
              <p className={styles.summaryLabel}>{totalVersionsLabel}</p>
              <p className={styles.summaryValue}>{releaseCount}</p>
            </SurfaceCard>
          </section>

          <nav className={styles.workspaceTabs}>
            <Link
              className={`${styles.workspaceTab} ${workspaceTab === "versions" ? styles.workspaceTabActive : ""}`}
              href={versionsTabHref}
            >
              {versionsTabLabel}
            </Link>
            <Link
              className={`${styles.workspaceTab} ${workspaceTab === "builder" ? styles.workspaceTabActive : ""}`}
              href={builderTabHref}
            >
              {builderTabLabel}
            </Link>
          </nav>

          {workspaceTab === "builder" ? (
            <section className={styles.builderPanel}>
              <header className={styles.builderHeader}>
                <h2 className={styles.sectionTitle}>{builderTitle}</h2>
                <p className={styles.builderHint}>{builderHint}</p>
              </header>
              <CatalogWritePanel
                selectedCourseId={selectedCourseId}
                language={language}
              />
            </section>
          ) : (
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
                <ActionLink
                  className={styles.secondaryAction}
                  href={builderTabHref}
                  variant="secondary"
                >
                  {openBuilderLabel}
                </ActionLink>
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
                      placeholder="1.0"
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
                      {messages.catalog.filterApply}
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
                      {messages.catalog.filterReset}
                    </ActionLink>
                  </div>
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
          )}
        </section>
      </section>
    </main>
  );
}
