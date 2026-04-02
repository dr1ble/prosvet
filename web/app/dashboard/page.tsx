import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchAdminAuthMeServer } from "@/features/auth/server";
import { ProfileAvatarBadge } from "@/features/auth/components/profile-avatar-badge";
import { LogoutActionButton } from "@/features/auth/components/logout-action-button";
import { ProfileNameForm } from "@/features/auth/components/profile-name-form";
import { ProfileAvatarPicker } from "@/features/auth/components/profile-avatar-picker";
import { fetchCourses } from "@/features/catalog/api";
import { fetchGroups, fetchGroupUsers } from "@/features/groups/api";
import { fetchProgressOverview } from "@/features/progress/api";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { resolveLanguage, type AppLanguage } from "@/shared/i18n/lang";
import { getUiMessages } from "@/shared/i18n/messages";

import styles from "./dashboard.module.css";

type HomePageProps = {
  searchParams: Promise<{
    lang?: string;
    modal?: string;
  }>;
};

type DashboardTile = {
  id: string;
  title: string;
  description: string;
  href?: string;
  requiredPermissions: string[];
};

function TileIcon({ id, className }: { id: string; className?: string }) {
  if (id === "catalog") {
    return (
      <svg
        className={className}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 4.5h9.2A2.8 2.8 0 0 1 16 7.3V15H6.8A2.8 2.8 0 0 0 4 17.8V4.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M6.8 6.6h6.4M6.8 9.6h6.4M6.8 12.6h4.1"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (id === "simulation") {
    return (
      <svg
        className={className}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="3.5"
          y="4"
          width="13"
          height="12"
          rx="2.2"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M8.3 8.1 12.4 10l-4.1 1.9V8.1Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (id === "moderation") {
    return (
      <svg
        className={className}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M10 3.3 15.6 5.8v4.5c0 3.5-2.2 5.7-5.6 6.7-3.4-1-5.6-3.2-5.6-6.7V5.8L10 3.3Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="m7.3 10.1 1.8 1.8 3.5-3.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (id === "groups") {
    return (
      <svg
        className={className}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="7" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.4" />
        <circle
          cx="13.2"
          cy="8.8"
          r="1.7"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M3.9 14.9a3.7 3.7 0 0 1 6.2-2.8m2.3 2.8a3 3 0 0 1 4-2.2"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (id === "users") {
    return (
      <svg
        className={className}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="10"
          cy="7.2"
          r="2.4"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M5.4 15.4a4.6 4.6 0 1 1 9.2 0"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (id === "progress") {
    return (
      <svg
        className={className}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 15.2V10m4 5.2V7.2m4 8V11m4 4.2V5.6"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (id === "settings") {
    return (
      <svg
        className={className}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M10 3.5 11.3 5.7l2.5.6-.9 2.4 1.6 2-2 1.6.6 2.5-2.4-.9-2.2 1.3-1.3-2.2-2.5-.6.9-2.4-1.6-2 2-1.6-.6-2.5 2.4.9L10 3.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle
          cx="10"
          cy="10"
          r="2.1"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function hasAnyPermission(
  permissions: string[],
  requiredPermissions: string[],
): boolean {
  return requiredPermissions.some((permission) =>
    permissions.includes(permission),
  );
}

function roleLabel(role: string, language: AppLanguage): string {
  const labels: Record<string, { ru: string; en: string }> = {
    administrator: {
      ru: "Администратор",
      en: "Administrator",
    },
    methodologist: {
      ru: "Методолог",
      en: "Methodologist",
    },
    moderator: {
      ru: "Модератор",
      en: "Moderator",
    },
    user: {
      ru: "Пользователь",
      en: "User",
    },
  };

  const resolved = labels[role];
  if (!resolved) {
    return role;
  }
  return language === "ru" ? resolved.ru : resolved.en;
}

function metricValue(value: number | null): string {
  if (value === null) {
    return "-";
  }
  return String(value);
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const language = resolveLanguage(params.lang);
  const messages = getUiMessages(language);
  const refreshRedirectHref = buildRefreshRedirectHref(
    `/dashboard?lang=${language}`,
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

  const comingSoonLabel = language === "ru" ? "Скоро" : "Soon";
  const dashboardBlockTitle = language === "ru" ? "Дашборд" : "Dashboard";
  const greetingTitle =
    language === "ru"
      ? `Доброе утро, ${profile.display_name ?? "коллега"}`
      : `Good morning, ${profile.display_name ?? "there"}`;
  const periodLabel = language === "ru" ? "За 7 дней" : "Last 7 days";
  const chartTitle = language === "ru" ? "Пульс обучения" : "Learning pulse";
  const completionLabel = language === "ru" ? "Завершение" : "Completion";
  const engagementLabel = language === "ru" ? "Активность" : "Engagement";
  const dashboardTitle =
    language === "ru" ? "Рабочий стол" : "Workspace Dashboard";
  const dashboardSubtitle =
    language === "ru"
      ? "Выберите раздел и продолжите работу с курсами, пользователями и публикациями."
      : "Pick a section and continue working with courses, users, and publishing.";
  const isSettingsModalOpen = params.modal === "settings";
  const isProfileModalOpen = params.modal === "profile";
  const isAnyModalOpen = isSettingsModalOpen || isProfileModalOpen;
  const closeModalHref = `/dashboard?lang=${language}`;

  const settingsTitle = language === "ru" ? "Настройки" : "Settings";
  const profileSettingsTitle =
    language === "ru" ? "Настройки профиля" : "Profile settings";
  const interfaceLanguageTitle =
    language === "ru" ? "Язык интерфейса" : "Interface language";
  const interfaceLanguageText =
    language === "ru"
      ? "Язык применяется ко всем рабочим экранам."
      : "Language is applied across all workspace screens.";
  const ruText =
    language === "ru" ? "Основной рабочий язык" : "Primary working language";
  const enText =
    language === "ru"
      ? "Когда нужен английский интерфейс"
      : "Use when English UI is needed";
  const currentLabel = language === "ru" ? "Сейчас выбран" : "Current";

  const catalogHref = `/catalog?lang=${language}`;
  const simulationHref = `/simulation-v2?lang=${language}`;
  const tiles: DashboardTile[] = [
    {
      id: "catalog",
      title: messages.home.catalogCardTitle,
      description: messages.home.catalogCardDescription,
      href: catalogHref,
      requiredPermissions: [
        "catalog.view",
        "catalog.course.create",
        "catalog.course.update",
      ],
    },
    {
      id: "simulation",
      title: language === "ru" ? "Конструктор симуляций" : "Simulation Builder",
      description:
        language === "ru"
          ? "Редактор сценариев с кликабельными зонами и ветвлениями урока."
          : "Scenario editor with clickable hotspots and lesson branching.",
      href: simulationHref,
      requiredPermissions: ["simulation.builder"],
    },
    {
      id: "moderation",
      title: language === "ru" ? "Модерация версий" : "Version Moderation",
      description:
        language === "ru"
          ? "Проверка качества, комментарии и решения по публикации."
          : "Quality review, moderation comments, and publication decisions.",
      requiredPermissions: ["moderation.review", "catalog.release.approve"],
    },
    {
      id: "groups",
      title:
        language === "ru" ? "Группы и назначения" : "Groups and Assignment",
      description:
        language === "ru"
          ? "Управление учебными группами и назначением курсов."
          : "Manage learning groups and assign courses.",
      href: `/groups?lang=${language}`,
      requiredPermissions: ["groups.manage"],
    },
    {
      id: "users",
      title: language === "ru" ? "Пользователи и права" : "Users and Access",
      description:
        language === "ru"
          ? "Роли, разрешения и доступ к административным действиям."
          : "Roles, permissions, and access control for admin actions.",
      href: `/users?lang=${language}`,
      requiredPermissions: ["users.manage", "rbac.manage"],
    },
    {
      id: "progress",
      title: language === "ru" ? "Прогресс" : "Progress",
      description:
        language === "ru"
          ? "Обзор прогресса обучения по пользователям, группам и курсам."
          : "Operational completion overview by users, groups, and courses.",
      href: `/progress?lang=${language}`,
      requiredPermissions: ["progress.view"],
    },
    {
      id: "settings",
      title: language === "ru" ? "Настройки" : "Settings",
      description:
        language === "ru"
          ? "Язык интерфейса и параметры рабочего пространства."
          : "Interface language and workspace preferences.",
      href: `/dashboard?lang=${language}&modal=settings`,
      requiredPermissions: ["dashboard.view"],
    },
  ];
  const visibleTiles = tiles.filter((tile) =>
    hasAnyPermission(profile.permissions, tile.requiredPermissions),
  );
  const actionableTiles = visibleTiles.filter((tile) => Boolean(tile.href));
  const accessCoverage =
    tiles.length > 0
      ? Math.round((visibleTiles.length / tiles.length) * 100)
      : 0;
  const actionableCoverage =
    tiles.length > 0
      ? Math.round((actionableTiles.length / tiles.length) * 100)
      : 0;

  const hasCatalogAccess = profile.permissions.includes("catalog.view");
  const hasGroupsAccess = profile.permissions.includes("groups.view");
  const hasProgressAccess = profile.permissions.includes("progress.view");

  const [coursesCount, groupsCount, usersCount, progressRows] =
    await Promise.all([
      hasCatalogAccess
        ? fetchCourses()
            .then((items) => items.length)
            .catch(() => null)
        : Promise.resolve<number | null>(null),
      hasGroupsAccess
        ? fetchGroups(accessToken)
            .then((items) => items.length)
            .catch(() => null)
        : Promise.resolve<number | null>(null),
      hasGroupsAccess
        ? fetchGroupUsers(accessToken)
            .then((items) => items.length)
            .catch(() => null)
        : Promise.resolve<number | null>(null),
      hasProgressAccess
        ? fetchProgressOverview(accessToken, {}).catch(() => [])
        : Promise.resolve([]),
    ]);

  const avgProgress =
    progressRows.length > 0
      ? Math.round(
          (progressRows.reduce((sum, row) => sum + row.completion_rate, 0) /
            progressRows.length) *
            100,
        )
      : null;
  const laggingUsers = progressRows.filter(
    (row) => row.completion_rate < 0.5,
  ).length;

  const profileTitle = language === "ru" ? "Профиль" : "Profile";
  const switchAccountLabel =
    language === "ru"
      ? "Войти в другой аккаунт"
      : "Sign in with another account";
  const logoutLabel = language === "ru" ? "Выйти" : "Logout";
  const logoutPendingLabel = language === "ru" ? "Выход..." : "Logging out...";
  const profileSettingsLabel =
    language === "ru" ? "Настройки профиля" : "Profile settings";
  const displayName =
    profile.display_name ?? (language === "ru" ? "Пользователь" : "User");
  const profileInitials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const statCards = [
    {
      title: language === "ru" ? "Курсов" : "Courses",
      value: metricValue(coursesCount),
      trend: `${accessCoverage}%`,
      tone: styles.statToneBlue,
    },
    {
      title: language === "ru" ? "Учебных групп" : "Groups",
      value: metricValue(groupsCount),
      trend: `${actionableCoverage}%`,
      tone: styles.statTonePurple,
    },
    {
      title: language === "ru" ? "Участников" : "Learners",
      value: metricValue(usersCount),
      trend: hasProgressAccess ? String(laggingUsers) : "-",
      tone: styles.statToneRose,
    },
    {
      title: language === "ru" ? "Средний прогресс" : "Avg progress",
      value: avgProgress === null ? "-" : `${avgProgress}%`,
      trend: periodLabel,
      tone: styles.statToneGreen,
    },
  ];

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.brandBlock}>
          <h1 className={styles.pageTitle}>{dashboardTitle}</h1>
          <p className={styles.brandCaption}>{dashboardSubtitle}</p>
        </div>
      </header>

      {visibleTiles.length === 0 ? (
        <section className={styles.emptyState}>
          {language === "ru"
            ? "Для вашей роли пока не настроены функции панели."
            : "No dashboard functions are configured for your role yet."}
        </section>
      ) : (
        <section className={styles.workspaceSplit}>
          <aside className={styles.sectionsSidebar}>
            <h2 className={styles.panelTitle}>
              {language === "ru" ? "Разделы" : "Sections"}
            </h2>
            <ul className={styles.sidebarList}>
              {visibleTiles.map((tile) => (
                <li key={tile.id}>
                  {tile.href ? (
                    <Link className={styles.sidebarLink} href={tile.href}>
                      <span className={styles.sidebarLead}>
                        <TileIcon id={tile.id} className={styles.sidebarIcon} />
                      </span>
                      <span className={styles.sidebarTitle}>{tile.title}</span>
                    </Link>
                  ) : (
                    <div
                      className={`${styles.sidebarLink} ${styles.sidebarLinkDisabled}`}
                    >
                      <span className={styles.sidebarLead}>
                        <TileIcon id={tile.id} className={styles.sidebarIcon} />
                      </span>
                      <span className={styles.sidebarTitle}>{tile.title}</span>
                      <span className={styles.sidebarMeta}>
                        {comingSoonLabel}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <div
              className={`${styles.profilePanel} ${styles.profilePanelSidebar}`}
            >
              <h3 className={styles.asideTitle}>{profileTitle}</h3>
              <details className={styles.profileMenu}>
                <summary className={styles.profileMenuSummary}>
                  <div className={styles.profileSummaryMain}>
                    <ProfileAvatarBadge
                      userKey={profile.user_id}
                      fallback={profileInitials || "U"}
                      className={styles.profileAvatar}
                    />
                    <div>
                      <p className={styles.profileName}>{displayName}</p>
                      <p className={styles.profileMeta}>
                        {roleLabel(profile.role, language)} ·{" "}
                        {profile.permissions.length}
                      </p>
                    </div>
                  </div>
                  <span
                    className={styles.profileMenuChevron}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </summary>
                <div className={styles.profileActions}>
                  <Link
                    href={`/dashboard?lang=${language}&modal=profile`}
                    className={styles.profileLink}
                  >
                    {profileSettingsLabel}
                  </Link>
                  <div className={styles.profileActionsRow}>
                    <LogoutActionButton
                      language={language}
                      className={styles.profileButton}
                      label={logoutLabel}
                      pendingLabel={logoutPendingLabel}
                    />
                    <Link
                      href={`/auth?lang=${language}`}
                      className={`${styles.profileLink} ${styles.profileLinkMuted}`}
                    >
                      {switchAccountLabel}
                    </Link>
                  </div>
                </div>
              </details>
            </div>
          </aside>

          <article className={styles.mainPanel}>
            <div className={styles.mainPrimary}>
              <div className={styles.dashboardShell}>
                <div className={styles.dashboardTopBar}>
                  <h3 className={styles.dashboardTitle}>{greetingTitle}</h3>
                  <div className={styles.dashboardTopActions}>
                    <span className={styles.periodBadge}>{periodLabel}</span>
                  </div>
                </div>

                <h3 className={styles.dashboardSectionTitle}>
                  {dashboardBlockTitle}
                </h3>

                <div className={styles.statGrid}>
                  {statCards.map((card) => (
                    <article key={card.title} className={styles.statCard}>
                      <div
                        className={`${styles.statIcon} ${card.tone}`}
                        aria-hidden="true"
                      />
                      <div className={styles.statContent}>
                        <p className={styles.statTitle}>{card.title}</p>
                        <strong className={styles.statValue}>
                          {card.value}
                        </strong>
                        <span className={styles.statTrend}>{card.trend}</span>
                      </div>
                    </article>
                  ))}
                </div>

                <article className={styles.chartPanel}>
                  <div className={styles.chartPanelHead}>
                    <h4 className={styles.chartPanelTitle}>{chartTitle}</h4>
                    <span className={styles.periodBadge}>{periodLabel}</span>
                  </div>
                  <svg
                    viewBox="0 0 560 180"
                    className={styles.lineChart}
                    role="presentation"
                    aria-hidden="true"
                  >
                    <polyline
                      points="0,130 60,118 120,126 180,98 240,104 300,78 360,90 420,70 480,86 560,74"
                      className={styles.chartLinePrimary}
                    />
                    <polyline
                      points="0,142 60,136 120,120 180,128 240,110 300,116 360,96 420,112 480,104 560,98"
                      className={styles.chartLineSecondary}
                    />
                  </svg>
                  <div className={styles.chartLegend}>
                    <span>
                      {completionLabel}:{" "}
                      {avgProgress === null ? "-" : `${avgProgress}%`}
                    </span>
                    <span>
                      {engagementLabel}: {actionableCoverage}%
                    </span>
                  </div>
                </article>
              </div>
            </div>
          </article>
        </section>
      )}

      {isAnyModalOpen ? (
        <div className={styles.modalOverlay}>
          <section className={styles.modalCard}>
            <header className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {isSettingsModalOpen ? settingsTitle : profileSettingsTitle}
              </h2>
              <Link
                className={styles.modalClose}
                href={closeModalHref}
                aria-label={language === "ru" ? "Закрыть" : "Close"}
              >
                ×
              </Link>
            </header>

            {isSettingsModalOpen ? (
              <div className={styles.modalBody}>
                <h3 className={styles.modalSectionTitle}>
                  {interfaceLanguageTitle}
                </h3>
                <p className={styles.modalText}>{interfaceLanguageText}</p>
                <div className={styles.langRow}>
                  <Link
                    href={`/dashboard?lang=ru&modal=settings`}
                    className={`${styles.langOption} ${language === "ru" ? styles.langOptionActive : ""}`}
                  >
                    <strong>Русский</strong>
                    <span>{ruText}</span>
                  </Link>
                  <Link
                    href={`/dashboard?lang=en&modal=settings`}
                    className={`${styles.langOption} ${language === "en" ? styles.langOptionActive : ""}`}
                  >
                    <strong>English</strong>
                    <span>{enText}</span>
                  </Link>
                </div>
                <p className={styles.modalText}>
                  {currentLabel}: <strong>{language.toUpperCase()}</strong>
                </p>
                <Link
                  className={styles.modalLinkButton}
                  href={`/dashboard?lang=${language}&modal=profile`}
                >
                  {profileSettingsTitle}
                </Link>
              </div>
            ) : (
              <div className={styles.modalBody}>
                <div className={styles.modalProfileHead}>
                  <p className={styles.modalProfileName}>{displayName}</p>
                  <p className={styles.modalProfileMeta}>
                    {roleLabel(profile.role, language)} ·{" "}
                    {profile.permissions.length}
                  </p>
                </div>
                <ProfileNameForm
                  language={language}
                  initialValue={profile.display_name ?? ""}
                />
                <ProfileAvatarPicker
                  userKey={profile.user_id}
                  fallbackInitials={profileInitials || "U"}
                  title={
                    language === "ru" ? "Аватар профиля" : "Profile avatar"
                  }
                />
              </div>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}
