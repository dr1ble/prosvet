import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchAdminAuthMeServer } from "@/features/auth/server";
import { fetchUsersOverview } from "@/features/users/api";
import { UsersAdminTable } from "@/features/users/components/users-admin-table";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { resolveLanguage } from "@/shared/i18n/lang";

import styles from "./users.module.css";

type UsersPageProps = {
  searchParams: Promise<{ lang?: string }>;
};

function roleLabel(role: string, language: "ru" | "en"): string {
  const labels: Record<string, { ru: string; en: string }> = {
    administrator: { ru: "Администратор", en: "Administrator" },
    methodologist: { ru: "Методолог", en: "Methodologist" },
    moderator: { ru: "Модератор", en: "Moderator" },
    user: { ru: "Пользователь", en: "User" },
  };
  return language === "ru"
    ? (labels[role]?.ru ?? role)
    : (labels[role]?.en ?? role);
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const language = resolveLanguage(params.lang) as "ru" | "en";
  const refreshRedirectHref = buildRefreshRedirectHref(
    `/users?lang=${language}`,
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

  if (
    !profile.permissions.includes("users.manage") &&
    !profile.permissions.includes("rbac.manage")
  ) {
    redirect(`/dashboard?lang=${language}`);
  }

  const overview = await fetchUsersOverview(accessToken);
  const activeUsers = overview.users.filter(
    (user) => user.status === "active",
  ).length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
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
            <h1 className={styles.title}>
              {language === "ru" ? "Пользователи и права" : "Users and Access"}
            </h1>
          </div>
          <p className={styles.subtitle}>
            {language === "ru"
              ? "Состав команды, роли и базовый доступ по каждому пользователю."
              : "Team roster, roles, and base access for each user."}
          </p>
        </div>
      </header>

      <section className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>
            {language === "ru" ? "Всего пользователей" : "Total users"}
          </p>
          <strong className={styles.kpiValue}>{overview.users.length}</strong>
        </article>
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>
            {language === "ru" ? "Активных" : "Active"}
          </p>
          <strong className={styles.kpiValue}>{activeUsers}</strong>
        </article>
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>
            {language === "ru" ? "Ролей" : "Roles"}
          </p>
          <strong className={styles.kpiValue}>
            {overview.role_summary.length}
          </strong>
        </article>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>
          {language === "ru" ? "Роли и доступы" : "Roles and permissions"}
        </h2>
        <div className={styles.roleGrid}>
          {overview.role_summary.map((role) => (
            <article key={role.role} className={styles.roleCard}>
              <div className={styles.roleHead}>
                <h3 className={styles.roleTitle}>
                  {roleLabel(role.role, language)}
                </h3>
                <span className={styles.roleCount}>{role.count}</span>
              </div>
              <div className={styles.permissionList}>
                {role.permissions.map((permission) => (
                  <span key={permission} className={styles.permissionChip}>
                    {permission}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>
          {language === "ru" ? "Пользователи" : "Users"}
        </h2>
        <UsersAdminTable
          language={language}
          initialUsers={overview.users}
          currentUserId={profile.user_id}
        />
      </section>
    </main>
  );
}
