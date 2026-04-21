import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { fetchAdminAuthMeServer } from "@/features/auth/server";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { buildRefreshRedirectHref } from "@/shared/auth/refresh-redirect";
import { resolveLanguage } from "@/shared/i18n/lang";
import { getUiMessages } from "@/shared/i18n/messages";
import { DataState } from "@/shared/ui/data-state";

import styles from "./review.module.css";

type ReviewPageProps = {
  params: Promise<{ releaseId: string }>;
  searchParams: Promise<{ lang?: string }>;
};

type ReleaseScreenDto = {
  id: string;
  release_id: string;
  screen_key: string;
  title: string;
  order_index: number;
  payload: Record<string, unknown>;
  checksum: string;
  created_at: string;
};

type PendingReleaseDto = {
  release_id: string;
  course_id: string;
  version: string;
  status: string;
  submitted_at: string;
  author_id: string | null;
};

function DiffSummary({
  current,
  previous,
  language,
}: {
  current: ReleaseScreenDto[];
  previous: ReleaseScreenDto[];
  language: string;
}) {
  const currentKeys = new Set(current.map((s) => s.screen_key));
  const previousKeys = new Set(previous.map((s) => s.screen_key));

  const added = current.filter((s) => !previousKeys.has(s.screen_key));
  const removed = previous.filter((s) => !currentKeys.has(s.screen_key));
  const modified = current.filter((s) => {
    if (!previousKeys.has(s.screen_key)) return false;
    const prev = previous.find((p) => p.screen_key === s.screen_key);
    return prev && prev.checksum !== s.checksum;
  });

  if (added.length === 0 && removed.length === 0 && modified.length === 0) {
    return (
      <div className={styles.diffNoChanges}>
        {language === "ru" ? "Изменений не обнаружено" : "No changes detected"}
      </div>
    );
  }

  return (
    <div className={styles.diffSummary}>
      {added.length > 0 && (
        <span className={styles.diffAdded}>
          + {added.length} {language === "ru" ? "добавлено" : "added"}
        </span>
      )}
      {removed.length > 0 && (
        <span className={styles.diffRemoved}>
          − {removed.length} {language === "ru" ? "удалено" : "removed"}
        </span>
      )}
      {modified.length > 0 && (
        <span className={styles.diffModified}>
          ~ {modified.length} {language === "ru" ? "изменено" : "modified"}
        </span>
      )}
    </div>
  );
}

export default async function ReviewPage({
  params,
  searchParams,
}: ReviewPageProps) {
  const { releaseId } = await params;
  const sp = await searchParams;
  const language = resolveLanguage(sp.lang);

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value ?? "";
  const refreshRedirectHref = buildRefreshRedirectHref(
    `/moderation/${releaseId}/review?lang=${language}`,
    language,
  );

  if (!accessToken) {
    redirect(refreshRedirectHref);
  }

  try {
    await fetchAdminAuthMeServer(accessToken);
  } catch {
    redirect(refreshRedirectHref);
  }

  const baseUrl = process.env.API_BASE_URL || "http://localhost:8000/api/v1";

  let pendingRelease: PendingReleaseDto | null = null;
  try {
    const res = await fetch(`${baseUrl}/moderation/releases/pending`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.ok) {
      const releases: PendingReleaseDto[] = await res.json();
      pendingRelease = releases.find((r) => r.release_id === releaseId) ?? null;
    }
  } catch {
    /* ignore */
  }

  let courseTitle = pendingRelease?.course_id ?? "";
  try {
    const coursesRes = await fetch(`${baseUrl}/catalog/courses`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (coursesRes.ok) {
      const coursesData = await coursesRes.json();
      const courses: Array<{ id: string; title: string }> =
        coursesData.items || coursesData || [];
      const course = courses.find((c) => c.id === pendingRelease?.course_id);
      if (course) courseTitle = course.title;
    }
  } catch {
    /* ignore */
  }

  let screens: ReleaseScreenDto[] = [];
  let diffData: {
    current_version: string;
    previous_version: string | null;
    current_screens: Array<Record<string, unknown>>;
    previous_screens: Array<Record<string, unknown>>;
  } | null = null;
  let error: string | null = null;
  try {
    const [screensRes, diffRes] = await Promise.all([
      fetch(`${baseUrl}/catalog/releases/${releaseId}/screens`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
      fetch(`${baseUrl}/catalog/releases/${releaseId}/diff`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
    ]);
    if (screensRes.ok) {
      screens = await screensRes.json();
    }
    if (diffRes.ok) {
      diffData = await diffRes.json();
    }
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Не удалось загрузить контент.";
  }

  const moderationHref = `/moderation?lang=${language}`;
  const backAriaLabel =
    language === "ru" ? "Назад к модерации" : "Back to moderation";

  const TASK_TYPE_LABELS: Record<string, string> = {
    theory_text: language === "ru" ? "Текст" : "Text",
    theory_video: language === "ru" ? "Видео" : "Video",
    quiz: language === "ru" ? "Квиз" : "Quiz",
    simulation: language === "ru" ? "Симуляция" : "Simulation",
    cheat_sheet: language === "ru" ? "Шпаргалка" : "Cheat Sheet",
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.titleRow}>
            <Link
              className={styles.backIconLink}
              href={moderationHref}
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
            <h1 className={styles.title}>
              {language === "ru" ? "Просмотр версии" : "Review Version"}
            </h1>
          </div>
          <p className={styles.subtitle}>
            {courseTitle} — v{pendingRelease?.version ?? releaseId}
          </p>
        </div>
      </header>

      <section className={styles.workspace}>
        {error ? (
          <DataState
            title={language === "ru" ? "Ошибка загрузки" : "Load Error"}
            description={error}
            tone="error"
          />
        ) : screens.length === 0 ? (
          <DataState
            title={language === "ru" ? "Нет контента" : "No Content"}
            description={
              language === "ru"
                ? "В этой версии нет экранов."
                : "This release has no screens."
            }
            tone="neutral"
          />
        ) : (
          <>
            {diffData?.previous_version && (
              <div className={styles.diffBanner}>
                <span className={styles.diffLabel}>
                  {language === "ru" ? "Сравнение версий:" : "Version diff:"}
                </span>
                <span className={styles.diffVersions}>
                  v{diffData.previous_version} → v{diffData.current_version}
                </span>
                <DiffSummary
                  current={screens}
                  previous={diffData.previous_screens as ReleaseScreenDto[]}
                  language={language}
                />
              </div>
            )}

            <div className={styles.screensList}>
              {screens
                .sort((a, b) => a.order_index - b.order_index)
                .map((screen) => {
                  const taskType = (screen.payload?.type as string) ?? "";
                  const label = TASK_TYPE_LABELS[taskType] ?? taskType;

                  return (
                    <div key={screen.id} className={styles.screenCard}>
                      <div className={styles.screenHeader}>
                        <span className={styles.screenOrder}>
                          #{screen.order_index}
                        </span>
                        <span className={styles.screenTitle}>
                          {screen.title}
                        </span>
                        <span className={styles.screenKey}>
                          {screen.screen_key}
                        </span>
                        {label && (
                          <span className={styles.screenType}>{label}</span>
                        )}
                      </div>

                      <div className={styles.screenContent}>
                        {taskType === "theory_text" && (
                          <div className={styles.textContent}>
                            {typeof screen.payload?.content === "string"
                              ? screen.payload.content
                              : JSON.stringify(
                                  screen.payload?.content ?? null,
                                  null,
                                  2,
                                )}
                          </div>
                        )}

                        {taskType === "theory_video" && (
                          <div className={styles.videoContent}>
                            <div className={styles.fieldRow}>
                              <span className={styles.fieldLabel}>URL:</span>
                              <span className={styles.fieldValue}>
                                {String(screen.payload?.video_url ?? "—")}
                              </span>
                            </div>
                            {screen.payload?.duration_sec != null && (
                              <div className={styles.fieldRow}>
                                <span className={styles.fieldLabel}>
                                  {language === "ru"
                                    ? "Длительность"
                                    : "Duration"}
                                  :
                                </span>
                                <span className={styles.fieldValue}>
                                  {String(screen.payload.duration_sec)}{" "}
                                  {language === "ru" ? "сек" : "sec"}
                                </span>
                              </div>
                            )}
                            {screen.payload?.transcript != null && (
                              <div className={styles.fieldRow}>
                                <span className={styles.fieldLabel}>
                                  {language === "ru"
                                    ? "Транскрипт"
                                    : "Transcript"}
                                  :
                                </span>
                                <span className={styles.fieldValue}>
                                  {String(screen.payload.transcript)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {taskType === "quiz" && (
                          <div className={styles.quizContent}>
                            {Array.isArray(screen.payload?.questions) &&
                              (
                                screen.payload.questions as Array<
                                  Record<string, unknown>
                                >
                              ).map((q, i) => (
                                <div key={i} className={styles.quizQuestion}>
                                  <div className={styles.questionText}>
                                    {language === "ru" ? "Вопрос" : "Question"}{" "}
                                    {i + 1}: {String(q.text ?? "—")}
                                  </div>
                                  {Array.isArray(q.options) &&
                                    (q.options as string[]).map((opt, j) => (
                                      <div
                                        key={j}
                                        className={`${styles.quizOption} ${q.correct_answer === j ? styles.quizOptionCorrect : ""}`}
                                      >
                                        {opt}
                                        {q.correct_answer === j && (
                                          <span className={styles.correctBadge}>
                                            ✓
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              ))}
                          </div>
                        )}

                        {taskType === "simulation" && (
                          <div className={styles.simContent}>
                            <div className={styles.fieldRow}>
                              <span className={styles.fieldLabel}>Config:</span>
                            </div>
                            <pre className={styles.jsonBlock}>
                              {JSON.stringify(
                                screen.payload?.config ?? {},
                                null,
                                2,
                              )}
                            </pre>
                          </div>
                        )}

                        {taskType === "cheat_sheet" && (
                          <div className={styles.textContent}>
                            {typeof screen.payload?.content === "string"
                              ? screen.payload.content
                              : JSON.stringify(
                                  screen.payload?.content ?? null,
                                  null,
                                  2,
                                )}
                          </div>
                        )}

                        {!taskType && (
                          <pre className={styles.jsonBlock}>
                            {JSON.stringify(screen.payload ?? {}, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
