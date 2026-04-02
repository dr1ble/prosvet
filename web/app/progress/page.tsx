import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchAdminAuthMeServer } from "@/features/auth/server";
import { fetchCourses } from "@/features/catalog/api";
import { fetchGroups, fetchGroupUsers } from "@/features/groups/api";
import { fetchProgressOverview } from "@/features/progress/api";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { resolveLanguage } from "@/shared/i18n/lang";
import { ActionLink } from "@/shared/ui/action-link";
import { DataState } from "@/shared/ui/data-state";

import styles from "./progress.module.css";

type ProgressPageProps = {
  searchParams: Promise<{
    groupId?: string;
    courseId?: string;
    userId?: string;
    sortBy?: string;
    sortDir?: string;
    laggingOnly?: string;
    lang?: string;
  }>;
};

type SortKey =
  | "group"
  | "course"
  | "user"
  | "status"
  | "completed"
  | "total"
  | "progress";

function toSortKey(value: string | undefined): SortKey {
  const allowed: SortKey[] = [
    "group",
    "course",
    "user",
    "status",
    "completed",
    "total",
    "progress",
  ];
  if (value && allowed.includes(value as SortKey)) {
    return value as SortKey;
  }
  return "progress";
}

function toSortDir(value: string | undefined): "asc" | "desc" {
  return value === "asc" ? "asc" : "desc";
}

function statusLabel(status: string): string {
  if (status === "active") return "Активно";
  if (status === "scheduled") return "Запланировано";
  if (status === "draft") return "Черновик";
  if (status === "completed") return "Завершено";
  if (status === "cancelled") return "Отменено";
  return status;
}

export default async function ProgressPage({
  searchParams,
}: ProgressPageProps) {
  const params = await searchParams;
  const language = resolveLanguage(params.lang);
  const sortBy = toSortKey(params.sortBy);
  const sortDir = toSortDir(params.sortDir);
  const laggingOnly = params.laggingOnly === "1";
  const refreshRedirectHref = buildRefreshRedirectHref(
    `/progress?lang=${language}`,
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
  if (!profile.permissions.includes("progress.view")) {
    redirect(`/dashboard?lang=${language}`);
  }

  const [groups, users, courses, rows] = await Promise.all([
    fetchGroups(accessToken),
    fetchGroupUsers(accessToken),
    fetchCourses(),
    fetchProgressOverview(accessToken, {
      groupId: params.groupId,
      courseId: params.courseId,
      userId: params.userId,
    }),
  ]);

  const uniqueUsers = users.filter(
    (user, index, list) =>
      list.findIndex((item) => item.user_id === user.user_id) === index,
  );

  const filteredRows = laggingOnly
    ? rows.filter((row) => row.completion_rate < 0.5)
    : rows;

  const sortedRows = [...filteredRows].sort((a, b) => {
    let left: string | number = 0;
    let right: string | number = 0;
    switch (sortBy) {
      case "group":
        left = a.group_name;
        right = b.group_name;
        break;
      case "course":
        left = a.course_title;
        right = b.course_title;
        break;
      case "user":
        left = a.user_display_name || a.user_login || "";
        right = b.user_display_name || b.user_login || "";
        break;
      case "status":
        left = a.assignment_status;
        right = b.assignment_status;
        break;
      case "completed":
        left = a.completed_lessons;
        right = b.completed_lessons;
        break;
      case "total":
        left = a.total_lessons;
        right = b.total_lessons;
        break;
      case "progress":
      default:
        left = a.completion_rate;
        right = b.completion_rate;
        break;
    }

    const result =
      typeof left === "string" && typeof right === "string"
        ? left.localeCompare(right, "ru")
        : Number(left) - Number(right);
    return sortDir === "asc" ? result : -result;
  });

  const uniqueUsersCount = new Set(sortedRows.map((row) => row.user_id)).size;
  const uniqueGroupsCount = new Set(sortedRows.map((row) => row.group_id)).size;
  const uniqueCoursesCount = new Set(sortedRows.map((row) => row.course_id))
    .size;
  const avgProgressPercent =
    sortedRows.length > 0
      ? Math.round(
          (sortedRows.reduce((sum, row) => sum + row.completion_rate, 0) /
            sortedRows.length) *
            100,
        )
      : 0;

  const statusMap = new Map<string, number>();
  for (const row of sortedRows) {
    statusMap.set(
      row.assignment_status,
      (statusMap.get(row.assignment_status) ?? 0) + 1,
    );
  }
  const statusStats = Array.from(statusMap.entries())
    .map(([status, count]) => ({
      status,
      count,
      percent:
        sortedRows.length > 0
          ? Math.round((count / sortedRows.length) * 100)
          : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const groupAgg = new Map<
    string,
    { name: string; total: number; completed: number }
  >();
  for (const row of sortedRows) {
    const current = groupAgg.get(row.group_id) ?? {
      name: row.group_name,
      total: 0,
      completed: 0,
    };
    current.total += row.total_lessons;
    current.completed += row.completed_lessons;
    groupAgg.set(row.group_id, current);
  }
  const topGroups = Array.from(groupAgg.values())
    .map((item) => ({
      ...item,
      percent:
        item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0,
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 6);

  const laggingRowsCount = sortedRows.filter(
    (row) => row.completion_rate < 0.5,
  ).length;
  const activeRowsCount = sortedRows.filter(
    (row) => row.assignment_status === "active",
  ).length;
  const nextFocus =
    laggingRowsCount > 0
      ? {
          title: "Нужны действия по отстающим",
          text: `Сейчас ${laggingRowsCount} записей с прогрессом ниже 50%. Сфокусируйтесь на них в таблице ниже.`,
        }
      : activeRowsCount === 0
        ? {
            title: "Нет активных назначений",
            text: "Проверьте статусы групповых назначений: сейчас в отчете нет ни одного активного курса.",
          }
        : {
            title: "Прогресс под контролем",
            text: "Критических провалов нет. Можно анализировать лучшие группы и точечно работать с назначениями.",
          };

  const base = `/progress?lang=${language}`;
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
            <h1 className={styles.title}>Прогресс</h1>
          </div>
          <p className={styles.subtitle}>
            Обзор прогресса обучения по группам, курсам и участникам.
          </p>
        </div>
      </header>

      <section className={styles.panel}>
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Пользователей в отчете</span>
            <strong className={styles.kpiValue}>{uniqueUsersCount}</strong>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Групп в отчете</span>
            <strong className={styles.kpiValue}>{uniqueGroupsCount}</strong>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Курсов в отчете</span>
            <strong className={styles.kpiValue}>{uniqueCoursesCount}</strong>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Средний прогресс</span>
            <strong className={styles.kpiValue}>{avgProgressPercent}%</strong>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Отстающих записей</span>
            <strong className={styles.kpiValue}>{laggingRowsCount}</strong>
          </div>
        </div>

        <div className={styles.nextStepCard}>
          <span className={styles.nextStepLabel}>Фокус</span>
          <strong className={styles.nextStepTitle}>{nextFocus.title}</strong>
          <p className={styles.nextStepText}>{nextFocus.text}</p>
        </div>

        <div className={styles.chartGrid}>
          <article className={styles.chartCard}>
            <h2 className={styles.chartTitle}>
              Распределение по статусам назначений
            </h2>
            <div className={styles.bars}>
              {statusStats.length === 0 ? (
                <DataState
                  compact
                  title="Нет данных"
                  description="Пока нет назначений, по которым можно построить распределение по статусам."
                />
              ) : (
                statusStats.map((item) => (
                  <div key={item.status} className={styles.barRow}>
                    <span className={styles.barLabel}>
                      {statusLabel(item.status)}
                    </span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${Math.max(item.percent, 2)}%` }}
                      />
                    </div>
                    <span className={styles.barValue}>{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className={styles.chartCard}>
            <h2 className={styles.chartTitle}>Топ групп по выполнению</h2>
            <div className={styles.bars}>
              {topGroups.length === 0 ? (
                <DataState
                  compact
                  title="Нет данных"
                  description="Нет записей для сравнения групп по выполнению."
                />
              ) : (
                topGroups.map((item) => (
                  <div key={item.name} className={styles.barRow}>
                    <span className={styles.barLabel}>{item.name}</span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFillAlt}
                        style={{ width: `${Math.max(item.percent, 2)}%` }}
                      />
                    </div>
                    <span className={styles.barValue}>{item.percent}%</span>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.filtersHead}>
          <div>
            <h2 className={styles.panelTitle}>Фильтры и сортировка</h2>
            <p className={styles.muted}>
              Сузьте отчет по группе, курсу, пользователю и проблемным записям.
            </p>
          </div>
        </div>
        <form className={styles.filters} method="GET" action="/progress">
          <input type="hidden" name="lang" value={language} />

          <select
            className={styles.select}
            name="groupId"
            defaultValue={params.groupId ?? ""}
          >
            <option value="">Все группы</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>

          <select
            className={styles.select}
            name="courseId"
            defaultValue={params.courseId ?? ""}
          >
            <option value="">Все курсы</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>

          <select
            className={styles.select}
            name="userId"
            defaultValue={params.userId ?? ""}
          >
            <option value="">Все пользователи</option>
            {uniqueUsers.map((user) => (
              <option key={user.user_id} value={user.user_id}>
                {user.display_name || user.login || user.user_id}
              </option>
            ))}
          </select>

          <select className={styles.select} name="sortBy" defaultValue={sortBy}>
            <option value="progress">Сортировка: прогресс</option>
            <option value="group">Сортировка: группа</option>
            <option value="course">Сортировка: курс</option>
            <option value="user">Сортировка: пользователь</option>
            <option value="status">Сортировка: статус</option>
            <option value="completed">Сортировка: завершено</option>
            <option value="total">Сортировка: всего уроков</option>
          </select>

          <select
            className={styles.select}
            name="sortDir"
            defaultValue={sortDir}
          >
            <option value="desc">По убыванию</option>
            <option value="asc">По возрастанию</option>
          </select>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="laggingOnly"
              value="1"
              defaultChecked={laggingOnly}
            />
            Только отстающие (&lt; 50%)
          </label>

          <button className={styles.btn} type="submit">
            Применить
          </button>
          <ActionLink href={base} variant="secondary">
            Сброс
          </ActionLink>
        </form>

        <div className={styles.quickStatsRow}>
          <span className={styles.quickStat}>Записей: {sortedRows.length}</span>
          <span className={styles.quickStat}>Активных: {activeRowsCount}</span>
          <span className={styles.quickStat}>
            Отстающих: {laggingRowsCount}
          </span>
        </div>

        {sortedRows.length === 0 ? (
          <DataState
            title="Нет данных для таблицы"
            description="Поменяйте фильтры или отключите режим «Только отстающие», чтобы увидеть записи по прогрессу."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Группа</th>
                  <th>Курс</th>
                  <th>Пользователь</th>
                  <th>Статус назначения</th>
                  <th>Завершено уроков</th>
                  <th>Всего уроков</th>
                  <th>Прогресс</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr
                    key={`${row.assignment_id}-${row.user_id}`}
                    className={
                      row.completion_rate < 0.5 ? styles.rowLagging : undefined
                    }
                  >
                    <td>{row.group_name}</td>
                    <td>{row.course_title}</td>
                    <td>
                      {row.user_display_name || row.user_login || row.user_id}
                    </td>
                    <td>
                      <span
                        className={`${styles.statusPill} ${styles[`status_${row.assignment_status}`] || ""}`}
                      >
                        {statusLabel(row.assignment_status)}
                      </span>
                    </td>
                    <td>{row.completed_lessons}</td>
                    <td>{row.total_lessons}</td>
                    <td>
                      <span
                        className={`${styles.progressPill} ${
                          row.completion_rate < 0.5
                            ? styles.progressLow
                            : row.completion_rate < 0.8
                              ? styles.progressMedium
                              : styles.progressHigh
                        }`}
                      >
                        {Math.round(row.completion_rate * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
