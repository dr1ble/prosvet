import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchAdminAuthMeServer } from "@/features/auth/server";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { resolveLanguage } from "@/shared/i18n/lang";
import { getUiMessages } from "@/shared/i18n/messages";
import { DataState } from "@/shared/ui/data-state";

import { fetchPolicies } from "@/features/rbac/api";
import { RbacPolicyTable } from "@/features/rbac/components/rbac-policy-table";

import styles from "./rbac-page.module.css";

export default async function RbacPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const language = resolveLanguage(params.lang);
  getUiMessages(language);
  const refreshRedirectHref = buildRefreshRedirectHref(
    `/rbac?lang=${language}`,
    language,
  );
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value ?? "";
  if (!accessToken) {
    redirect(refreshRedirectHref);
  }

  let profile;
  try {
    profile = await fetchAdminAuthMeServer(accessToken);
  } catch {
    redirect(refreshRedirectHref);
  }

  if (!profile.permissions.includes("rbac.manage")) {
    return (
      <main className={styles.page}>
        <header className={styles.topBar}>
          <div className={styles.headerMain}>
            <div className={styles.titleRow}>
              <Link
                className={styles.backIconLink}
                href={`/dashboard?lang=${language}`}
                aria-label={
                  language === "ru"
                    ? "Назад к рабочему столу"
                    : "Back to dashboard"
                }
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
              <h1 className={styles.pageTitle}>
                {language === "ru" ? "Нет доступа" : "Access Denied"}
              </h1>
            </div>
          </div>
        </header>
        <DataState
          title={language === "ru" ? "Нет доступа" : "Access Denied"}
          description={
            language === "ru"
              ? "У вас нет прав для управления политиками доступа."
              : "You do not have permission to manage access policies."
          }
        />
      </main>
    );
  }

  let rules;
  try {
    rules = await fetchPolicies(accessToken);
  } catch {
    return (
      <main className={styles.page}>
        <header className={styles.topBar}>
          <div className={styles.headerMain}>
            <div className={styles.titleRow}>
              <Link
                className={styles.backIconLink}
                href={`/dashboard?lang=${language}`}
                aria-label={
                  language === "ru"
                    ? "Назад к рабочему столу"
                    : "Back to dashboard"
                }
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
              <h1 className={styles.pageTitle}>
                {language === "ru" ? "Ошибка загрузки" : "Failed to load"}
              </h1>
            </div>
          </div>
        </header>
        <DataState
          title={language === "ru" ? "Ошибка загрузки" : "Failed to load"}
          description={
            language === "ru"
              ? "Не удалось загрузить политики доступа. Попробуйте обновить страницу."
              : "Failed to load access policies. Try refreshing the page."
          }
        />
      </main>
    );
  }

  const pageTitle =
    language === "ru" ? "Управление доступом" : "Access Management";
  const pageDescription =
    language === "ru"
      ? "Настройте, какие роли имеют доступ к каждой политике системы. Изменения применяются после сохранения."
      : "Configure which roles have access to each system policy. Changes apply after saving.";
  const backLabel = language === "ru" ? "← Назад" : "← Back";

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.headerMain}>
          <div className={styles.titleRow}>
            <Link
              className={styles.backIconLink}
              href={`/dashboard?lang=${language}`}
              aria-label={
                language === "ru"
                  ? "Назад к рабочему столу"
                  : "Back to dashboard"
              }
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
            <h1 className={styles.pageTitle}>{pageTitle}</h1>
          </div>
          <p className={styles.pageDescription}>{pageDescription}</p>
        </div>
      </header>

      <RbacPolicyTable
        initialRules={rules}
        accessToken={accessToken}
        language={language}
      />
    </main>
  );
}
