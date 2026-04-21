import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { fetchAdminAuthMeServer } from "@/features/auth/server";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { formatLocale, resolveLanguage } from "@/shared/i18n/lang";
import { getUiMessages } from "@/shared/i18n/messages";
import { DataState } from "@/shared/ui/data-state";

import styles from "../../moderation.module.css";

type HistoryPageProps = {
  params: Promise<{ releaseId: string }>;
  searchParams: Promise<{ lang?: string }>;
};

type HistoryEntryDto = {
  id: string;
  release_id: string;
  from_status: string;
  to_status: string;
  actor_user_id: string;
  reason: string | null;
  changed_at: string;
};

export default async function HistoryPage({
  params,
  searchParams,
}: HistoryPageProps) {
  const { releaseId } = await params;
  const sp = await searchParams;
  const language = resolveLanguage(sp.lang);
  const messages = getUiMessages(language);
  const locale = formatLocale(language);

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value ?? "";
  const refreshRedirectHref = buildRefreshRedirectHref(
    `/moderation/${releaseId}/history?lang=${language}`,
    language,
  );

  if (!accessToken) {
    redirect(refreshRedirectHref);
  }

  try {
    await fetchAdminAuthMeServer(accessToken);
  } catch {
    redirect(refreshRedirectHref);
  }

  let history: HistoryEntryDto[] = [];

  try {
    const baseUrl = process.env.API_BASE_URL || "http://localhost:8000/api/v1";
    const response = await fetch(
      `${baseUrl}/moderation/releases/${releaseId}/history`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (response.ok) {
      history = await response.json();
    }
  } catch {
    history = [];
  }

  const moderationHref = `/moderation?lang=${language}`;
  const backAriaLabel =
    language === "ru" ? "Назад к модерации" : "Back to moderation";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.titleRow}>
            <Link
              className={styles.backIconLink}
              href={moderationHref}
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
            <h1 className={styles.title}>{messages.moderation.historyTitle}</h1>
          </div>
          <p className={styles.subtitle}>
            {language === "ru"
              ? `История изменений версии ${releaseId}.`
              : `Change history for release ${releaseId}.`}
          </p>
        </div>
      </header>

      <section className={styles.workspace}>
        {history.length === 0 ? (
          <DataState
            title={messages.moderation.noHistory}
            description={
              language === "ru"
                ? "Нет записей об изменениях для этой версии."
                : "No change records found for this release."
            }
            tone="neutral"
          />
        ) : (
          <div className={styles.timeline}>
            {history.map((entry) => (
              <div key={entry.id} className={styles.timelineItem}>
                <div className={styles.timelineMarker} />
                <div className={styles.timelineContent}>
                  <div className={styles.transitionBadge}>
                    <span className={styles.fromStatus}>
                      {entry.from_status}
                    </span>
                    <span className={styles.arrow}>→</span>
                    <span className={styles.toStatus}>{entry.to_status}</span>
                  </div>
                  <div className={styles.meta}>
                    {new Intl.DateTimeFormat(locale, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(entry.changed_at))}
                  </div>
                  {entry.reason && (
                    <p className={styles.reason}>{entry.reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
