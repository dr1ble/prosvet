import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { fetchAdminAuthMeServer } from "@/features/auth/server";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { resolveLanguage } from "@/shared/i18n/lang";
import { getUiMessages } from "@/shared/i18n/messages";
import { DataState } from "@/shared/ui/data-state";

import styles from "../../moderation.module.css";

type ActionPageProps = {
  params: Promise<{ releaseId: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export default async function RejectPage({
  params,
  searchParams,
}: ActionPageProps) {
  const { releaseId } = await params;
  const sp = await searchParams;
  const language = resolveLanguage(sp.lang);
  const messages = getUiMessages(language);

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value ?? "";
  const refreshRedirectHref = buildRefreshRedirectHref(
    `/moderation/${releaseId}/reject?lang=${language}`,
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
            <h1 className={styles.title}>
              {language === "ru" ? "Отклонить версию" : "Reject Release"}
            </h1>
          </div>
          <p className={styles.subtitle}>
            {language === "ru"
              ? `Версия ${releaseId} отклонена. Автор может внести исправления и отправить повторно.`
              : `Release ${releaseId} has been rejected. The author can make changes and resubmit.`}
          </p>
        </div>
      </header>

      <section className={styles.workspace}>
        <DataState
          title={language === "ru" ? "Отклонено" : "Rejected"}
          description={
            language === "ru"
              ? "Версия отклонена. Укажите причину в комментарии."
              : "Release has been rejected. Please provide a reason in the comment."
          }
          tone="error"
        />
      </section>
    </main>
  );
}
