import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchAdminAuthMeServer } from "@/features/auth/server";
import { fetchUsersOverview } from "@/features/users/api";
import { UsersAdminTable } from "@/features/users/components/users-admin-table";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { resolveLanguage } from "@/shared/i18n/lang";
import { DataState } from "@/shared/ui/data-state";

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

function permissionLabel(permission: string, language: "ru" | "en"): string {
  const labels: Record<string, { ru: string; en: string }> = {
    "dashboard.view": { ru: "Просмотр панели", en: "Dashboard view" },
    "catalog.view": { ru: "Просмотр каталога", en: "Catalog view" },
    "catalog.course.create": { ru: "Создание курса", en: "Create course" },
    "catalog.course.update": {
      ru: "Редактирование курса",
      en: "Edit course",
    },
    "catalog.release.create": {
      ru: "Создание версии курса",
      en: "Create course version",
    },
    "catalog.release.submit_review": {
      ru: "Отправка версии на проверку",
      en: "Submit version for review",
    },
    "catalog.release.approve": {
      ru: "Одобрение версии курса",
      en: "Approve course version",
    },
    "catalog.release.publish": {
      ru: "Публикация версии курса",
      en: "Publish course version",
    },
    "catalog.release.update_published": {
      ru: "Обновление опубликованной версии",
      en: "Update published version",
    },
    "simulation.builder": {
      ru: "Конструктор симуляций",
      en: "Simulation builder",
    },
    "moderation.review": { ru: "Проверка материалов", en: "Review content" },
    "groups.view": { ru: "Просмотр групп", en: "View groups" },
    "groups.manage": { ru: "Управление группами", en: "Manage groups" },
    "auth.qr.personal.issue": {
      ru: "Выдача персонального QR",
      en: "Issue personal QR",
    },
    "auth.qr.onboarding.issue": {
      ru: "Выдача QR для нового пользователя",
      en: "Issue new-user QR",
    },
    "users.view": { ru: "Просмотр пользователей", en: "View users" },
    "users.manage": { ru: "Управление пользователями", en: "Manage users" },
    "rbac.manage": { ru: "Управление правами", en: "Manage access" },
    "progress.view": { ru: "Просмотр прогресса", en: "View progress" },
    "progress.view.self": {
      ru: "Просмотр своего прогресса",
      en: "View own progress",
    },
    "search.view": { ru: "Поиск", en: "Search" },
    "support.request.create": {
      ru: "Создание обращения",
      en: "Create support request",
    },
    "support.request.view": {
      ru: "Просмотр обращений",
      en: "View support requests",
    },
    "support.request.manage": {
      ru: "Управление обращениями",
      en: "Manage support requests",
    },
  };
  return language === "ru"
    ? (labels[permission]?.ru ?? permission)
    : (labels[permission]?.en ?? permission);
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

      <section className={styles.panel}>
        <UsersAdminTable
          language={language}
          title={language === "ru" ? "Пользователи" : "Users"}
          initialUsers={overview.users}
          currentUserId={profile.user_id}
          summary={
            <div className={styles.summaryChips}>
              <span className={styles.summaryChip}>
                {language === "ru" ? "Всего" : "Total"}: {overview.users.length}
              </span>
              <span className={styles.summaryChip}>
                {language === "ru" ? "Активных" : "Active"}: {activeUsers}
              </span>
              <span className={styles.summaryChip}>
                {language === "ru" ? "Ролей" : "Roles"}:{" "}
                {overview.role_summary.length}
              </span>
            </div>
          }
        />
      </section>

      <section className={styles.panel}>
        <details className={styles.rolesDetails}>
          <summary className={styles.rolesSummary}>
            <span className={styles.rolesSummaryText}>
              <span>
                {language === "ru" ? "Роли и доступы" : "Roles and permissions"}
              </span>
            </span>
            <span className={styles.rolesChevron} aria-hidden="true" />
          </summary>
          <div className={styles.roleGrid}>
            {overview.role_summary.length === 0 ? (
              <DataState
                title={language === "ru" ? "Нет ролей" : "No roles yet"}
                description={
                  language === "ru"
                    ? "Ролевой срез пока пуст. Проверьте загрузку данных пользователей."
                    : "Role summary is empty. Verify user data source and assignments."
                }
              />
            ) : (
              overview.role_summary.map((role) => (
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
                        {permissionLabel(permission, language)}
                      </span>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        </details>
      </section>
    </main>
  );
}
