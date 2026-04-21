import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchAdminAuthMeServer } from "@/features/auth/server";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { resolveLanguage } from "@/shared/i18n/lang";
import { ActionLink } from "@/shared/ui/action-link";

import styles from "./settings.module.css";

type SettingsPageProps = {
  searchParams: Promise<{ lang?: string }>;
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const params = await searchParams;
  const language = resolveLanguage(params.lang);
  const isRu = language === "ru";
  const refreshRedirectHref = buildRefreshRedirectHref(
    `/settings?lang=${language}`,
    language,
  );

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value ?? "";
  if (!accessToken) {
    redirect(refreshRedirectHref);
  }

  const profile = await fetchAdminAuthMeServer(accessToken).catch(() => {
    redirect(refreshRedirectHref);
  });
  if (!profile.permissions.includes("dashboard.view")) {
    redirect(`/dashboard?lang=${language}`);
  }

  const pageTitle = isRu ? "Настройки" : "Settings";
  const subtitle = isRu
    ? "Язык интерфейса и базовые параметры рабочего пространства."
    : "Interface language and basic workspace preferences.";
  const backAriaLabel = isRu ? "Назад к рабочему столу" : "Back to dashboard";
  const sectionTitle = isRu ? "Язык интерфейса" : "Interface language";
  const sectionText = isRu
    ? "Язык применяется ко всем рабочим экранам. Выберите вариант, который вам удобнее."
    : "Language is applied across all workspace screens. Pick what works better for you.";
  const ruText = isRu ? "Основной рабочий язык" : "Primary working language";
  const enText = isRu
    ? "Когда нужен английский интерфейс"
    : "Use when English UI is needed";
  const currentLabel = isRu ? "Сейчас выбран" : "Current";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <div className={styles.titleRow}>
              <Link
                className={styles.backIconLink}
                href={`/dashboard?lang=${language}`}
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
              <h1 className={styles.title}>{pageTitle}</h1>
            </div>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
        </header>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>{sectionTitle}</h2>
          <p className={styles.panelText}>{sectionText}</p>

          <div className={styles.langStack}>
            <ActionLink
              href="/dashboard?lang=ru"
              variant={language === "ru" ? "primary" : "secondary"}
              className={styles.langOption}
            >
              <span className={styles.optionTitle}>Русский</span>
              <span className={styles.optionText}>{ruText}</span>
            </ActionLink>

            <ActionLink
              href="/dashboard?lang=en"
              variant={language === "en" ? "primary" : "secondary"}
              className={styles.langOption}
            >
              <span className={styles.optionTitle}>English</span>
              <span className={styles.optionText}>{enText}</span>
            </ActionLink>
          </div>

          <p className={styles.currentLanguage}>
            {currentLabel}: <strong>{language.toUpperCase()}</strong>
          </p>
        </section>
      </div>
    </main>
  );
}
