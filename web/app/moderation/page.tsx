import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { fetchAdminAuthMeServer } from "@/features/auth/server";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { formatLocale, resolveLanguage } from "@/shared/i18n/lang";
import { getUiMessages } from "@/shared/i18n/messages";
import { DataState } from "@/shared/ui/data-state";

import styles from "./moderation.module.css";

type ModerationPageProps = {
  searchParams: Promise<{
    lang?: string;
  }>;
};

type PendingReleaseDto = {
  release_id: string;
  course_id: string;
  version: string;
  status: string;
  submitted_at: string;
  author_id: string | null;
};

export default async function ModerationPage({
  searchParams,
}: ModerationPageProps) {
  const params = await searchParams;
  const language = resolveLanguage(params.lang);
  const messages = getUiMessages(language);
  const locale = formatLocale(language);

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value ?? "";
  const refreshRedirectHref = buildRefreshRedirectHref(
    `/moderation?lang=${language}`,
    language,
  );

  if (!accessToken) {
    redirect(refreshRedirectHref);
  }

  let profile: Awaited<ReturnType<typeof fetchAdminAuthMeServer>>;
  try {
    profile = await fetchAdminAuthMeServer(accessToken);
  } catch {
    redirect(refreshRedirectHref);
  }

  let pendingReleases: PendingReleaseDto[] = [];
  let courseMap: Record<string, string> = {};
  let authorMap: Record<string, string> = {};
  let error: string | null = null;

  try {
    const baseUrl = process.env.API_BASE_URL || "http://localhost:8000/api/v1";

    const [pendingRes, coursesRes] = await Promise.all([
      fetch(`${baseUrl}/moderation/releases/pending`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
      fetch(`${baseUrl}/catalog/courses`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
    ]);

    if (pendingRes.ok) {
      pendingReleases = await pendingRes.json();
    }

    if (coursesRes.ok) {
      const coursesData = await coursesRes.json();
      const courses: Array<{
        id: string;
        title: string;
        author_id: string | null;
        author_display_name: string | null;
      }> = coursesData.items || coursesData || [];
      courseMap = Object.fromEntries(courses.map((c) => [c.id, c.title]));
      authorMap = Object.fromEntries(
        courses
          .filter((c) => c.author_display_name)
          .map((c) => [c.id, c.author_display_name as string]),
      );

      if (profile.role === "methodologist") {
        const ownCourseIds = new Set(
          courses
            .filter((c) => c.author_id === profile.user_id)
            .map((c) => c.id),
        );
        pendingReleases = pendingReleases.filter((r) =>
          ownCourseIds.has(r.course_id),
        );
      }
    }
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Не удалось загрузить очередь модерации.";
  }

  const dashboardHref = `/dashboard?lang=${language}`;
  const backAriaLabel =
    language === "ru" ? "Назад к рабочему столу" : "Back to dashboard";

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
            <h1 className={styles.title}>
              {messages.moderation.moderationTitle}
            </h1>
          </div>
          <p className={styles.subtitle}>
            {language === "ru"
              ? "Проверка и одобрение версий курсов перед публикацией."
              : "Review and approve course versions before publication."}
          </p>
        </div>
      </header>

      <section className={styles.workspace}>
        {error ? (
          <DataState
            title={language === "ru" ? "Ошибка загрузки" : "Load Error"}
            description={error}
            tone="error"
          />
        ) : pendingReleases.length === 0 ? (
          <DataState
            title={messages.moderation.queueEmpty}
            description={
              language === "ru"
                ? "Все версии проверены. Новые версии появятся здесь после отправки."
                : "All versions have been reviewed. New versions will appear here after submission."
            }
            tone="neutral"
          />
        ) : (
          <div className={styles.tableShell}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>
                    {messages.moderation.versionLabel}
                  </th>
                  <th className={styles.th}>
                    {messages.moderation.courseLabel}
                  </th>
                  <th className={styles.th}>
                    {language === "ru" ? "Статус" : "Status"}
                  </th>
                  <th className={styles.th}>{messages.moderation.dateLabel}</th>
                  <th className={styles.th}>
                    {language === "ru" ? "Действия" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingReleases.map((release) => (
                  <tr key={release.release_id} className={styles.tr}>
                    <td className={styles.td}>
                      <span className={styles.versionCode}>
                        {release.version}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.courseMeta}>
                        <span className={styles.courseTitle}>
                          {courseMap[release.course_id] ||
                            release.course_id.slice(0, 8)}
                        </span>
                        <span className={styles.courseAuthor}>
                          {language === "ru" ? "Автор" : "Author"}:{" "}
                          {authorMap[release.course_id] || "—"}
                        </span>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span
                        className={`${styles.statusTag} ${
                          release.status === "pending_review"
                            ? styles.statusPending
                            : release.status === "approved"
                              ? styles.statusApproved
                              : release.status === "rejected"
                                ? styles.statusRejected
                                : styles.statusDraft
                        }`}
                      >
                        {release.status === "pending_review"
                          ? messages.moderation.pendingReview
                          : release.status === "approved"
                            ? messages.moderation.approved
                            : release.status === "rejected"
                              ? messages.moderation.rejected
                              : release.status}
                      </span>
                    </td>
                    <td className={styles.td}>
                      {new Intl.DateTimeFormat(locale, {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(release.submitted_at))}
                    </td>
                    <td className={styles.td}>
                      <div className={styles.actionGroup}>
                        <Link
                          href={`/moderation/${release.release_id}/review?lang=${language}`}
                          className={styles.viewLink}
                        >
                          {language === "ru" ? "Просмотр" : "View"}
                        </Link>
                        <Link
                          href={`/moderation/${release.release_id}/history?lang=${language}`}
                          className={styles.historyLink}
                        >
                          {messages.moderation.historyTitle}
                        </Link>
                        <Link
                          href={`/moderation/${release.release_id}/approve?lang=${language}`}
                          className={styles.approveLink}
                        >
                          {messages.moderation.approveAction}
                        </Link>
                        <Link
                          href={`/moderation/${release.release_id}/reject?lang=${language}`}
                          className={styles.rejectLink}
                        >
                          {messages.moderation.rejectAction}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
