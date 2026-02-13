import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { fetchAdminAuthMeServer } from "@/features/auth/server";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { resolveLanguage, type AppLanguage } from "@/shared/i18n/lang";
import { getUiMessages } from "@/shared/i18n/messages";
import { ActionLink } from "@/shared/ui/action-link";
import { LanguageSwitch } from "@/shared/ui/language-switch";
import { SurfaceCard } from "@/shared/ui/surface-card";

import styles from "./dashboard.module.css";

type HomePageProps = {
  searchParams: Promise<{
    lang?: string;
  }>;
};

type DashboardTile = {
  id: string;
  title: string;
  description: string;
  href?: string;
  requiredPermissions: string[];
  phaseLabel?: string;
};

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

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const language = resolveLanguage(params.lang);
  const messages = getUiMessages(language);
  const refreshRedirectHref = buildRefreshRedirectHref(
    `/dashboard?lang=${language}`,
    language,
  );
  const cookieStore = await cookies();
  const accessToken =
    cookieStore.get(ADMIN_ACCESS_COOKIE)?.value ??
    process.env.WEB_ADMIN_ACCESS_TOKEN ??
    "";
  if (!accessToken) {
    redirect(refreshRedirectHref);
  }

  let profile;
  try {
    profile = await fetchAdminAuthMeServer(accessToken);
  } catch {
    redirect(refreshRedirectHref);
  }

  const openLabel = language === "ru" ? "Перейти" : "Open";
  const comingSoonLabel = language === "ru" ? "Скоро" : "Soon";
  const dashboardTitle =
    language === "ru" ? "Рабочий стол" : "Workspace Dashboard";
  const dashboardSubtitle =
    language === "ru"
      ? "Выберите раздел и продолжите работу с курсами, пользователями и публикациями."
      : "Pick a section and continue working with courses, users, and publishing.";

  const roleLabelText = language === "ru" ? "Роль" : "Role";
  const permissionsLabel = language === "ru" ? "Доступы" : "Permissions";
  const profileLabel = language === "ru" ? "Профиль" : "Profile";

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
      phaseLabel: "Phase 2",
    },
    {
      id: "groups",
      title:
        language === "ru" ? "Группы и назначения" : "Groups and Assignment",
      description:
        language === "ru"
          ? "Управление учебными группами и назначением курсов."
          : "Manage learning groups and assign courses.",
      requiredPermissions: ["groups.manage"],
      phaseLabel: "Phase 2",
    },
    {
      id: "users",
      title: language === "ru" ? "Пользователи и права" : "Users and Access",
      description:
        language === "ru"
          ? "Роли, разрешения и доступ к административным действиям."
          : "Roles, permissions, and access control for admin actions.",
      requiredPermissions: ["users.manage", "rbac.manage"],
      phaseLabel: "Phase 2",
    },
  ];
  const visibleTiles = tiles.filter((tile) =>
    hasAnyPermission(profile.permissions, tile.requiredPermissions),
  );

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.brandBlock}>
          <p className={styles.brandName}>Learning Console</p>
          <h1 className={styles.pageTitle}>{dashboardTitle}</h1>
          <p className={styles.brandCaption}>{dashboardSubtitle}</p>
        </div>
        <div className={styles.topActions}>
          <LanguageSwitch
            currentLanguage={language}
            ruHref="/dashboard?lang=ru"
            enHref="/dashboard?lang=en"
            label={messages.languageLabel}
          />
        </div>
      </header>

      <section className={styles.statusStrip}>
        <div className={styles.statusChip}>
          <span>{roleLabelText}:</span>
          <strong>{roleLabel(profile.role, language)}</strong>
        </div>
        <div className={styles.statusChip}>
          <span>{profileLabel}:</span>
          <strong>
            {profile.display_name ??
              (language === "ru" ? "Без имени" : "No display name")}
          </strong>
        </div>
        <div className={styles.statusChip}>
          <span>{permissionsLabel}:</span>
          <strong>{profile.permissions.length}</strong>
        </div>
      </section>

      {visibleTiles.length === 0 ? (
        <SurfaceCard className={styles.emptyState} tone="muted">
          {language === "ru"
            ? "Для вашей роли пока не настроены функции панели."
            : "No dashboard functions are configured for your role yet."}
        </SurfaceCard>
      ) : (
        <section className={styles.functions}>
          {visibleTiles.map((tile) => (
            <SurfaceCard
              as="article"
              className={styles.functionCard}
              key={tile.id}
            >
              <div className={styles.tileHeader}>
                <h2 className={styles.functionTitle}>{tile.title}</h2>
                {tile.phaseLabel && (
                  <span className={styles.phaseBadge}>{tile.phaseLabel}</span>
                )}
              </div>
              <p className={styles.functionDescription}>{tile.description}</p>
              {tile.href ? (
                <ActionLink
                  className={styles.functionLink}
                  href={tile.href}
                  variant="primary"
                >
                  {openLabel}
                </ActionLink>
              ) : (
                <span className={styles.functionLinkDisabled}>
                  {comingSoonLabel}
                </span>
              )}
            </SurfaceCard>
          ))}
        </section>
      )}
    </main>
  );
}
