import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { fetchAdminAuthMeServer } from "@/features/auth/server";
import { ModerationDecisionForm } from "@/features/moderation/ModerationDecisionForm";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { resolveLanguage } from "@/shared/i18n/lang";

import styles from "../../moderation.module.css";

type ActionPageProps = {
  params: Promise<{ releaseId: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export default async function ApprovePage({
  params,
  searchParams,
}: ActionPageProps) {
  const { releaseId } = await params;
  const sp = await searchParams;
  const language = resolveLanguage(sp.lang);

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value ?? "";
  const refreshRedirectHref = buildRefreshRedirectHref(
    `/moderation/${releaseId}/approve?lang=${language}`,
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
              {language === "ru" ? "Одобрить версию" : "Approve Release"}
            </h1>
          </div>
          <p className={styles.subtitle}>
            {language === "ru"
              ? `Подтвердите одобрение версии ${releaseId}. После одобрения она становится доступна для публикации.`
              : `Confirm approval of release ${releaseId}. Approved releases can be published.`}
          </p>
        </div>
      </header>

      <section className={styles.workspace}>
        <ModerationDecisionForm
          releaseId={releaseId}
          action="approve"
          language={language}
          moderationHref={moderationHref}
          labels={{
            submit: language === "ru" ? "Одобрить" : "Approve",
            submitting: language === "ru" ? "Одобрение…" : "Approving…",
            success:
              language === "ru"
                ? "Версия одобрена. Возвращаемся к очереди модерации…"
                : "Release approved. Returning to the moderation queue…",
            cancel: language === "ru" ? "Отмена" : "Cancel",
            commentLabel:
              language === "ru"
                ? "Комментарий (необязательно)"
                : "Comment (optional)",
            commentPlaceholder:
              language === "ru"
                ? "Опишите, почему одобряете эту версию."
                : "Describe why you are approving this version.",
            commentRequiredError:
              language === "ru" ? "Поле обязательно." : "Comment is required.",
            commentMinLengthError:
              language === "ru"
                ? "Минимум 10 символов."
                : "Minimum 10 characters.",
          }}
        />
      </section>
    </main>
  );
}
