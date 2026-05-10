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

export default async function RejectPage({
  params,
  searchParams,
}: ActionPageProps) {
  const { releaseId } = await params;
  const sp = await searchParams;
  const language = resolveLanguage(sp.lang);

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
              ? `Укажите причину отклонения версии ${releaseId}. Автор сможет внести правки и отправить снова.`
              : `Provide a reason for rejecting release ${releaseId}. The author will be able to make edits and resubmit.`}
          </p>
        </div>
      </header>

      <section className={styles.workspace}>
        <ModerationDecisionForm
          releaseId={releaseId}
          action="reject"
          language={language}
          moderationHref={moderationHref}
          labels={{
            submit: language === "ru" ? "Отклонить" : "Reject",
            submitting: language === "ru" ? "Отклонение…" : "Rejecting…",
            success:
              language === "ru"
                ? "Версия отклонена. Возвращаемся к очереди модерации…"
                : "Release rejected. Returning to the moderation queue…",
            cancel: language === "ru" ? "Отмена" : "Cancel",
            commentLabel:
              language === "ru"
                ? "Причина отклонения (обязательно, минимум 10 символов)"
                : "Rejection reason (required, min 10 characters)",
            commentPlaceholder:
              language === "ru"
                ? "Опишите, что именно нужно исправить."
                : "Describe what should be fixed.",
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
