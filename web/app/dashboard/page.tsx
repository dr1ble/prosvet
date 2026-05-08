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
import { DataState } from "@/shared/ui/data-state";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { resolveLanguage, type AppLanguage } from "@/shared/i18n/lang";
import { getUiMessages } from "@/shared/i18n/messages";

import { PeriodSelect } from "./period-select";
import styles from "./dashboard.module.css";

type HomePageProps = {
  searchParams: Promise<{
    lang?: string;
    modal?: string;
    period?: string;
  }>;
};

type DashboardPeriod = "all" | "7d" | "14d" | "30d" | "90d";

const DASHBOARD_PERIODS: readonly DashboardPeriod[] = [
  "7d",
  "14d",
  "30d",
  "90d",
  "all",
];

function resolveDashboardPeriod(value?: string): DashboardPeriod {
  if (!value) {
    return "7d";
  }
  return DASHBOARD_PERIODS.includes(value as DashboardPeriod)
    ? (value as DashboardPeriod)
    : "7d";
}

type DashboardTile = {
  id: string;
  title: string;
  description: string;
  href: string;
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

  if (id === "search") {
    return (
      <svg
        className={className}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="4.5" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="m12.4 12.4 3.1 3.1"
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
          d="M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM7.5 10a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M12.245 1.679c-.66-2.238-3.83-2.238-4.49 0l-.118.399a1.091 1.091 0 0 1-1.569.65l-.365-.2c-2.05-1.115-4.291 1.127-3.175 3.176l.199.365a1.091 1.091 0 0 1-.65 1.569l-.399.118c-2.238.66-2.238 3.83 0 4.49l.399.118a1.091 1.091 0 0 1 .65 1.569l-.2.365c-1.115 2.05 1.127 4.291 3.176 3.175l.365-.199a1.091 1.091 0 0 1 1.569.65l.118.399c.66 2.238 3.83 2.238 4.49 0l.118-.399a1.091 1.091 0 0 1 1.569-.65l.365.2c2.05 1.115 4.291-1.127 3.175-3.176l-.199-.365a1.091 1.091 0 0 1 .65-1.569l.399-.118c2.238-.66 2.238-3.83 0-4.49l-.399-.118a1.091 1.091 0 0 1-.65-1.569l.2-.365c1.115-2.05-1.127-4.291-3.176-3.175l-.365.199a1.091 1.091 0 0 1-1.569-.65z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (id === "rbac") {
    return (
      <svg
        className={className}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M10 2.5L15.5 5v5c0 3.5-2.2 5.7-5.5 6.7-3.3-1-5.5-3.2-5.5-6.7V5L10 2.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 10l1.7 1.7L12.5 8.4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
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
  const period = resolveDashboardPeriod(params.period);
  const messages = getUiMessages(language);

  const withDashboardState = (basePath: string): string => {
    const [path, query = ""] = basePath.split("?");
    const qs = new URLSearchParams(query);
    qs.set("period", period);
    return `${path}?${qs.toString()}`;
  };

  const periodLabelByValue: Record<DashboardPeriod, string> = {
    all: language === "ru" ? "За всё время" : "All time",
    "7d": language === "ru" ? "За 7 дней" : "Last 7 days",
    "14d": language === "ru" ? "За 14 дней" : "Last 14 days",
    "30d": language === "ru" ? "За 30 дней" : "Last 30 days",
    "90d": language === "ru" ? "За 90 дней" : "Last 90 days",
  };
  const refreshRedirectHref = buildRefreshRedirectHref(
    withDashboardState(`/dashboard?lang=${language}`),
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

  const dashboardBlockTitle = language === "ru" ? "Дашборд" : "Dashboard";
  const greetingTitle =
    language === "ru"
      ? `Доброе утро, ${profile.display_name ?? "коллега"}`
      : `Good morning, ${profile.display_name ?? "there"}`;
  const periodLabel = periodLabelByValue[period];
  const periodSelectorLabel = language === "ru" ? "Период" : "Period";
  const periodOptions = DASHBOARD_PERIODS.map((value) => ({
    value,
    label: periodLabelByValue[value],
  }));
  const dashboardTitle =
    language === "ru" ? "Рабочий стол" : "Workspace Dashboard";
  const dashboardSubtitle =
    language === "ru"
      ? "Выберите раздел и продолжите работу с курсами, пользователями и публикациями."
      : "Pick a section and continue working with courses, users, and publishing.";
  const isSettingsModalOpen = params.modal === "settings";
  const isProfileModalOpen = params.modal === "profile";
  const isAnyModalOpen = isSettingsModalOpen || isProfileModalOpen;
  const closeModalHref = withDashboardState(`/dashboard?lang=${language}`);

  const settingsTitle = language === "ru" ? "Настройки" : "Settings";
  const profileSettingsTitle =
    language === "ru" ? "Настройки профиля" : "Profile settings";
  const interfaceLanguageTitle =
    language === "ru" ? "Язык интерфейса" : "Interface language";
  const currentLabel = language === "ru" ? "Сейчас выбран" : "Current";

  const catalogHref = withDashboardState(`/catalog?lang=${language}`);
  const simulationHref = withDashboardState(`/simulation-v2?lang=${language}`);
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
      href: withDashboardState(`/moderation?lang=${language}`),
    },
    {
      id: "groups",
      title:
        language === "ru" ? "Группы и назначения" : "Groups and Assignment",
      description:
        language === "ru"
          ? "Управление учебными группами и назначением курсов."
          : "Manage learning groups and assign courses.",
      href: withDashboardState(`/groups?lang=${language}`),
      requiredPermissions: ["groups.manage"],
    },
    {
      id: "users",
      title: language === "ru" ? "Пользователи и права" : "Users and Access",
      description:
        language === "ru"
          ? "Роли, разрешения и доступ к административным действиям."
          : "Roles, permissions, and access control for admin actions.",
      href: withDashboardState(`/users?lang=${language}`),
      requiredPermissions: ["users.manage", "rbac.manage"],
    },
    {
      id: "progress",
      title: language === "ru" ? "Прогресс" : "Progress",
      description:
        language === "ru"
          ? "Обзор прогресса обучения по пользователям, группам и курсам."
          : "Operational completion overview by users, groups, and courses.",
      href: withDashboardState(`/progress?lang=${language}`),
      requiredPermissions: ["progress.view"],
    },
    {
      id: "support",
      title: language === "ru" ? "Заявки помощи" : "Help Requests",
      description:
        language === "ru"
          ? "Обращения учеников из мобильной кнопки SOS по сложностям в курсах."
          : "Learner SOS requests about course difficulties from the mobile app.",
      href: withDashboardState(`/support?lang=${language}`),
      requiredPermissions: ["support.request.view"],
    },
    {
      id: "settings",
      title: language === "ru" ? "Настройки" : "Settings",
      description:
        language === "ru"
          ? "Язык интерфейса и быстрый доступ к ключевым разделам."
          : "Interface language and quick access to core sections.",
      href: withDashboardState(`/dashboard?lang=${language}&modal=settings`),
      requiredPermissions: ["dashboard.view"],
    },
    {
      id: "rbac",
      title: language === "ru" ? "Управление доступом" : "Access Management",
      description:
        language === "ru"
          ? "Настройка ролей и политик доступа к функциям системы."
          : "Configure roles and access policies for system features.",
      href: withDashboardState(`/rbac?lang=${language}`),
      requiredPermissions: ["rbac.manage"],
    },
  ];
  const visibleTiles = tiles.filter((tile) =>
    hasAnyPermission(profile.permissions, tile.requiredPermissions),
  );
  const workspaceTiles = visibleTiles.filter((tile) => tile.id !== "settings");
  const hasCatalogAccess = profile.permissions.includes("catalog.view");
  const hasGroupsAccess = profile.permissions.includes("groups.view");
  const hasProgressAccess = profile.permissions.includes("progress.view");

  const [coursesMetric, groupsMetric, usersMetric, progressMetric] =
    await Promise.all([
      hasCatalogAccess
        ? fetchCourses(accessToken)
            .then((items) => ({ value: items.length, failed: false }))
            .catch(() => ({ value: null as number | null, failed: true }))
        : Promise.resolve({ value: null as number | null, failed: false }),
      hasGroupsAccess
        ? fetchGroups(accessToken)
            .then((items) => ({ value: items.length, failed: false }))
            .catch(() => ({ value: null as number | null, failed: true }))
        : Promise.resolve({ value: null as number | null, failed: false }),
      hasGroupsAccess
        ? fetchGroupUsers(accessToken)
            .then((items) => ({ value: items.length, failed: false }))
            .catch(() => ({ value: null as number | null, failed: true }))
        : Promise.resolve({ value: null as number | null, failed: false }),
      hasProgressAccess
        ? fetchProgressOverview(accessToken, { period })
            .then((rows) => ({ rows, failed: false }))
            .catch(() => ({
              rows: [] as Awaited<ReturnType<typeof fetchProgressOverview>>,
              failed: true,
            }))
        : Promise.resolve({
            rows: [] as Awaited<ReturnType<typeof fetchProgressOverview>>,
            failed: false,
          }),
    ]);

  const coursesCount = coursesMetric.value;
  const groupsCount = groupsMetric.value;
  const usersCount = usersMetric.value;
  const progressRows = progressMetric.rows;

  const avgProgress =
    progressRows.length > 0
      ? Math.round(
          (progressRows.reduce((sum, row) => sum + row.completion_rate, 0) /
            progressRows.length) *
            100,
        )
      : null;

  const hasModerationAccess = hasAnyPermission(profile.permissions, [
    "moderation.review",
    "catalog.release.approve",
  ]);
  const hasSupportAccess = profile.permissions.includes("support.request.view");

  let moderationPendingCount: number | null = null;
  let supportNewCount: number | null = null;
  let supportInProgressCount: number | null = null;

  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:8000/api/v1";

  if (hasModerationAccess) {
    try {
      const pendingRes = await fetch(
        `${apiBaseUrl}/moderation/releases/pending`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        },
      );
      if (pendingRes.ok) {
        const pending = (await pendingRes.json()) as unknown[];
        moderationPendingCount = pending.length;
      }
    } catch {
      moderationPendingCount = null;
    }
  }

  if (hasSupportAccess) {
    try {
      const supportRes = await fetch(`${apiBaseUrl}/support/help-requests`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (supportRes.ok) {
        const payload = (await supportRes.json()) as {
          requests?: { status: string }[];
        };
        const requests = payload.requests ?? [];
        supportNewCount = requests.filter(
          (request) => request.status === "new",
        ).length;
        supportInProgressCount = requests.filter(
          (request) => request.status === "in_progress",
        ).length;
      }
    } catch {
      supportNewCount = null;
      supportInProgressCount = null;
    }
  }

  const profileTitle = language === "ru" ? "Профиль" : "Profile";
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

  const hasDataWarning =
    coursesMetric.failed ||
    groupsMetric.failed ||
    usersMetric.failed ||
    progressMetric.failed;
  const dataWarningText =
    language === "ru"
      ? "Часть метрик сейчас недоступна. Обновите страницу позже."
      : "Some metrics are temporarily unavailable. Please refresh later.";

  const statCards = [
    {
      title: language === "ru" ? "Курсов" : "Courses",
      value: metricValue(coursesCount),
      tone: styles.statToneBlue,
    },
    {
      title: language === "ru" ? "Учебных групп" : "Groups",
      value: metricValue(groupsCount),
      tone: styles.statTonePurple,
    },
    {
      title: language === "ru" ? "Участников" : "Learners",
      value: metricValue(usersCount),
      tone: styles.statToneRose,
    },
    {
      title: language === "ru" ? "Средний прогресс" : "Avg progress",
      value: avgProgress === null ? "-" : `${avgProgress}%`,
      tone: styles.statToneGreen,
    },
  ];

  const attentionItems = [
    {
      label:
        language === "ru"
          ? "Пользователи без прогресса"
          : "Learners without progress",
      value: progressRows.filter((row) => row.completed_lessons === 0).length,
      href: withDashboardState(`/progress?lang=${language}`),
    },
    {
      label:
        language === "ru"
          ? "Группы без назначений"
          : "Groups without assignments",
      value:
        groupsCount !== null
          ? Math.max(groupsCount - progressRows.length, 0)
          : null,
      href: withDashboardState(`/groups?lang=${language}`),
    },
    {
      label:
        language === "ru"
          ? "Средний прогресс ниже 50%"
          : "Avg progress below 50%",
      value: avgProgress !== null && avgProgress < 50 ? 1 : 0,
      href: withDashboardState(`/progress?lang=${language}`),
    },
    {
      label:
        language === "ru" ? "Курсы без публикации" : "Courses not published",
      value: coursesCount,
      href: withDashboardState(`/catalog?lang=${language}`),
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
        <DataState
          title={
            language === "ru"
              ? "Нет доступных разделов"
              : "No sections available"
          }
          description={
            language === "ru"
              ? "Для вашей роли пока не настроены функции панели."
              : "No dashboard functions are configured for your role yet."
          }
        />
      ) : (
        <section className={styles.workspaceSplit}>
          <aside className={styles.sectionsSidebar}>
            <h2 className={styles.panelTitle}>
              {language === "ru" ? "Разделы" : "Sections"}
            </h2>
            <ul className={styles.sidebarList}>
              {visibleTiles.map((tile) => (
                <li key={tile.id}>
                  <Link className={styles.sidebarLink} href={tile.href}>
                    <span className={styles.sidebarLead}>
                      <TileIcon id={tile.id} className={styles.sidebarIcon} />
                    </span>
                    <span className={styles.sidebarTitle}>{tile.title}</span>
                  </Link>
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
                    href={withDashboardState(
                      `/dashboard?lang=${language}&modal=profile`,
                    )}
                    className={styles.profileLink}
                  >
                    {profileSettingsLabel}
                  </Link>
                  <LogoutActionButton
                    language={language}
                    className={styles.profileButton}
                    label={logoutLabel}
                    pendingLabel={logoutPendingLabel}
                  />
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
                    <PeriodSelect
                      language={language}
                      value={period}
                      label={periodSelectorLabel}
                      options={periodOptions}
                    />
                  </div>
                </div>

                <h3 className={styles.dashboardSectionTitle}>
                  {dashboardBlockTitle}
                </h3>

                {hasDataWarning ? (
                  <p className={styles.dataWarning}>{dataWarningText}</p>
                ) : null}

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
                      </div>
                    </article>
                  ))}
                </div>

                <div className={styles.dashboardActionGrid}>
                  <article
                    className={`${styles.dashboardInfoPanel} ${styles.attentionPanel}`}
                  >
                    <div className={styles.chartPanelHead}>
                      <h4 className={styles.chartPanelTitle}>
                        {language === "ru"
                          ? "Требуют внимания"
                          : "Need attention"}
                      </h4>
                    </div>
                    <div className={styles.attentionList}>
                      {attentionItems.map((item) => (
                        <Link
                          key={item.label}
                          className={styles.attentionItemLink}
                          href={item.href}
                        >
                          <span>{item.label}</span>
                          <strong>
                            {item.value === null ? "-" : item.value}
                          </strong>
                        </Link>
                      ))}
                    </div>
                  </article>

                  <article className={styles.dashboardInfoPanel}>
                    <div className={styles.chartPanelHead}>
                      <h4 className={styles.chartPanelTitle}>
                        {language === "ru"
                          ? "Оперативная очередь"
                          : "Operational queue"}
                      </h4>
                    </div>

                    {hasModerationAccess ? (
                      <div className={styles.queueSection}>
                        <p className={styles.queueSectionTitle}>
                          {language === "ru" ? "Модерация" : "Moderation"}
                        </p>
                        <Link
                          className={styles.attentionItemLink}
                          href={withDashboardState(
                            `/moderation?lang=${language}`,
                          )}
                        >
                          <span>
                            {language === "ru"
                              ? "На проверке"
                              : "Pending review"}
                          </span>
                          <strong>{moderationPendingCount ?? "-"}</strong>
                        </Link>
                      </div>
                    ) : null}

                    {hasSupportAccess ? (
                      <div className={styles.queueSection}>
                        <p className={styles.queueSectionTitle}>
                          {language === "ru"
                            ? "Заявки помощи"
                            : "Help requests"}
                        </p>
                        <div className={styles.attentionList}>
                          <Link
                            className={styles.attentionItemLink}
                            href={withDashboardState(
                              `/support?lang=${language}&status=new`,
                            )}
                          >
                            <span>{language === "ru" ? "Новые" : "New"}</span>
                            <strong>{supportNewCount ?? "-"}</strong>
                          </Link>
                          <Link
                            className={styles.attentionItemLink}
                            href={withDashboardState(
                              `/support?lang=${language}&status=in_progress`,
                            )}
                          >
                            <span>
                              {language === "ru" ? "В работе" : "In progress"}
                            </span>
                            <strong>{supportInProgressCount ?? "-"}</strong>
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </article>
                </div>
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
                <div className={styles.langRow}>
                  <Link
                    href={withDashboardState(
                      `/dashboard?lang=ru&modal=settings`,
                    )}
                    className={`${styles.langOption} ${language === "ru" ? styles.langOptionActive : ""}`}
                  >
                    <strong>Русский</strong>
                  </Link>
                  <Link
                    href={withDashboardState(
                      `/dashboard?lang=en&modal=settings`,
                    )}
                    className={`${styles.langOption} ${language === "en" ? styles.langOptionActive : ""}`}
                  >
                    <strong>English</strong>
                  </Link>
                </div>
                <p className={styles.modalText}>
                  {currentLabel}: <strong>{language.toUpperCase()}</strong>
                </p>
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
