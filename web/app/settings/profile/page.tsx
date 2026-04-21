import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutActionButton } from "@/features/auth/components/logout-action-button";
import { ProfileAvatarPicker } from "@/features/auth/components/profile-avatar-picker";
import { fetchAdminAuthMeServer } from "@/features/auth/server";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { resolveLanguage } from "@/shared/i18n/lang";

import styles from "./profile-settings.module.css";

type ProfileSettingsPageProps = {
  searchParams: Promise<{ lang?: string }>;
};

function roleLabel(role: string, isRu: boolean): string {
  if (role === "administrator") return isRu ? "Администратор" : "Administrator";
  if (role === "methodologist") return isRu ? "Методолог" : "Methodologist";
  if (role === "moderator") return isRu ? "Модератор" : "Moderator";
  if (role === "user") return isRu ? "Пользователь" : "User";
  return role;
}

export default async function ProfileSettingsPage({
  searchParams,
}: ProfileSettingsPageProps) {
  const params = await searchParams;
  const language = resolveLanguage(params.lang);
  const isRu = language === "ru";
  const refreshRedirectHref = buildRefreshRedirectHref(
    `/settings/profile?lang=${language}`,
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

  const displayName = profile.display_name ?? (isRu ? "Пользователь" : "User");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <Link
              className={styles.backIconLink}
              href={`/settings?lang=${language}`}
              aria-label={isRu ? "Назад в настройки" : "Back to settings"}
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
            <h1 className={styles.title}>{isRu ? "Профиль" : "Profile"}</h1>
          </div>
          <p className={styles.subtitle}>
            {isRu
              ? "Управление аватаром и действиями аккаунта."
              : "Manage avatar and account actions."}
          </p>
        </header>

        <section className={styles.card}>
          <p className={styles.name}>{displayName}</p>
          <p className={styles.meta}>
            {roleLabel(profile.role, isRu)} · {profile.permissions.length}
          </p>

          <ProfileAvatarPicker
            userKey={profile.user_id}
            fallbackInitials={initials || "U"}
            title={isRu ? "Аватар профиля" : "Profile avatar"}
          />

          <div className={styles.actions}>
            <LogoutActionButton
              language={language}
              className={styles.actionButton}
              label={isRu ? "Выйти" : "Logout"}
              pendingLabel={isRu ? "Выход..." : "Logging out..."}
            />
          </div>
        </section>
      </section>
    </main>
  );
}
