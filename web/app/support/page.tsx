import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { fetchAdminAuthMeServer } from "@/features/auth/server";
import {
  fetchHelpRequests,
  helpRequestStatusLabel,
  helpRequestTypeLabel,
  updateHelpRequest,
} from "@/features/support/api";
import type { HelpRequestStatus } from "@/features/support/types";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { resolveLanguage } from "@/shared/i18n/lang";
import { DataState } from "@/shared/ui/data-state";

import styles from "./support.module.css";

type SupportPageProps = {
  searchParams: Promise<{
    status?: string;
    type?: string;
    lang?: string;
  }>;
};

const statusOptions: HelpRequestStatus[] = ["new", "in_progress", "resolved"];

async function updateSupportRequestAction(formData: FormData): Promise<void> {
  "use server";

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value ?? "";
  if (!accessToken) return;

  const requestId = String(formData.get("requestId") ?? "");
  const status = String(formData.get("status") ?? "new") as HelpRequestStatus;
  const staffComment = String(formData.get("staffComment") ?? "");
  if (!requestId || !statusOptions.includes(status)) return;

  await updateHelpRequest(accessToken, requestId, { status, staffComment });
  revalidatePath("/support");
}

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const params = await searchParams;
  const language = resolveLanguage(params.lang);
  const refreshRedirectHref = buildRefreshRedirectHref(
    `/support?lang=${language}`,
    language,
  );
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value ?? "";
  if (!accessToken) redirect(refreshRedirectHref);

  const profile = await fetchAdminAuthMeServer(accessToken).catch(() => {
    redirect(refreshRedirectHref);
  });
  if (!profile.permissions.includes("support.request.view")) {
    redirect(`/dashboard?lang=${language}`);
  }

  const requestsResult = await fetchHelpRequests(accessToken, {
    status: params.status,
    requestType: params.type,
  })
    .then((requests) => ({ requests, error: null }))
    .catch((error: unknown) => ({
      requests: [],
      error:
        error instanceof Error
          ? error.message
          : "Не удалось загрузить заявки помощи.",
    }));
  const requests = requestsResult.requests;
  const counts = statusOptions.reduce(
    (acc, status) => ({
      ...acc,
      [status]: requests.filter((request) => request.status === status).length,
    }),
    {} as Record<HelpRequestStatus, number>,
  );

  const base = `/support?lang=${language}`;
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
            <h1 className={styles.title}>Заявки помощи по курсам</h1>
          </div>
          <p className={styles.subtitle}>
            Обращения, которые ученики отправляют через кнопку SOS в мобильном
            приложении.
          </p>
        </div>
      </header>

      <section className={styles.filters} aria-label="Фильтры заявок">
        <Link
          className={!params.status ? styles.filterActive : styles.filter}
          href={base}
        >
          Все
        </Link>
        {statusOptions.map((status) => (
          <Link
            key={status}
            className={
              params.status === status ? styles.filterActive : styles.filter
            }
            href={`${base}&status=${status}`}
          >
            {helpRequestStatusLabel(status)} ({counts[status] ?? 0})
          </Link>
        ))}
      </section>

      {requestsResult.error ? (
        <DataState
          title="Не удалось загрузить заявки"
          description={requestsResult.error}
          tone="error"
          role="alert"
        />
      ) : requests.length === 0 ? (
        <DataState
          title="Заявок пока нет"
          description="Когда ученик попросит помощь из курса, заявка появится здесь."
        />
      ) : (
        <section className={styles.grid}>
          {requests.map((request) => (
            <article key={request.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.badge} data-status={request.status}>
                    {helpRequestStatusLabel(request.status)}
                  </span>
                  <h2 className={styles.cardTitle}>
                    {helpRequestTypeLabel(request.request_type)}
                  </h2>
                </div>
                <time className={styles.time} dateTime={request.created_at}>
                  {new Date(request.created_at).toLocaleString("ru-RU")}
                </time>
              </div>

              <p className={styles.message}>{request.message}</p>

              <dl className={styles.meta}>
                <div>
                  <dt>Ученик</dt>
                  <dd>{request.requester_name ?? request.requester_id}</dd>
                </div>
                <div>
                  <dt>Курс</dt>
                  <dd>{request.course_title ?? "Не указан"}</dd>
                </div>
                <div>
                  <dt>Урок</dt>
                  <dd>{request.lesson_title ?? "Не указан"}</dd>
                </div>
                <div>
                  <dt>Экран</dt>
                  <dd>
                    {request.screen_title ?? request.screen_key ?? "Не указан"}
                  </dd>
                </div>
              </dl>

              <form className={styles.form} action={updateSupportRequestAction}>
                <input type="hidden" name="requestId" value={request.id} />
                <label className={styles.label}>
                  Статус
                  <select
                    name="status"
                    defaultValue={request.status}
                    className={styles.select}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {helpRequestStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.label}>
                  Комментарий сотрудника
                  <textarea
                    name="staffComment"
                    defaultValue={request.staff_comment ?? ""}
                    className={styles.textarea}
                    rows={3}
                    placeholder="Например: созвонились, объяснил шаг 2"
                  />
                </label>
                <button className={styles.submit} type="submit">
                  Сохранить
                </button>
              </form>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
