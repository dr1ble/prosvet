import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchAdminAuthMeServer } from "@/features/auth/server";
import { fetchCourses } from "@/features/catalog/api";
import {
  fetchGroupAssignments,
  fetchGroupMembers,
  fetchGroups,
  fetchGroupUsers,
} from "@/features/groups/api";
import { GroupsWorkspace } from "@/features/groups/components/groups-workspace";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { resolveLanguage } from "@/shared/i18n/lang";

import styles from "./groups.module.css";

type GroupsPageProps = {
  searchParams: Promise<{
    groupId?: string;
    lang?: string;
  }>;
};

export default async function GroupsPage({ searchParams }: GroupsPageProps) {
  const params = await searchParams;
  const language = resolveLanguage(params.lang);
  const refreshRedirectHref = buildRefreshRedirectHref(
    `/groups?lang=${language}`,
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

  if (!profile.permissions.includes("groups.view")) {
    redirect(`/dashboard?lang=${language}`);
  }

  const [groups, users, courses] = await Promise.all([
    fetchGroups(accessToken),
    fetchGroupUsers(accessToken),
    fetchCourses(),
  ]);

  const selectedGroupId =
    params.groupId && groups.some((group) => group.id === params.groupId)
      ? params.groupId
      : (groups[0]?.id ?? null);

  const [members, assignments] = selectedGroupId
    ? await Promise.all([
        fetchGroupMembers(accessToken, selectedGroupId),
        fetchGroupAssignments(accessToken, selectedGroupId),
      ])
    : [[], []];

  const backAriaLabel =
    language === "ru" ? "Назад к рабочему столу" : "Back to dashboard";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
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
            <h1 className={styles.title}>Группы и назначения</h1>
          </div>
          <p className={styles.subtitle}>
            Управление учебными группами, участниками и назначением курсов.
          </p>
        </div>
      </header>

      <GroupsWorkspace
        language={language}
        initialGroups={groups}
        initialUsers={users}
        initialMembers={members}
        initialAssignments={assignments}
        initialSelectedGroupId={selectedGroupId}
        courses={courses}
      />
    </main>
  );
}
