import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { fetchAdminAuthMeServer } from "@/features/auth/server";
import { buildSimulationScope } from "@/features/simulation/model/scope";
import { SimulationEditor } from "@/features/simulation/ui/editor";
import { ADMIN_ACCESS_COOKIE } from "@/shared/auth/cookies";
import { resolveLanguage, type AppLanguage } from "@/shared/i18n/lang";

import styles from "./simulation-v2.module.css";

type SimulationPageProps = {
  searchParams: Promise<{
    lang?: string;
    courseId?: string;
    moduleId?: string;
    lessonId?: string;
  }>;
};

function compactId(value: string): string {
  if (value.length <= 16) {
    return value;
  }
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function formatScopeLabel(
  language: AppLanguage,
  scope: ReturnType<typeof buildSimulationScope>,
): string {
  if (scope.isGlobal) {
    return language === "ru"
      ? "Без привязки к курсу"
      : "Global (not attached to a course)";
  }

  const parts: string[] = [];
  if (scope.courseId) {
    parts.push(
      language === "ru"
        ? `Курс ${compactId(scope.courseId)}`
        : `Course ${compactId(scope.courseId)}`,
    );
  }
  if (scope.moduleId) {
    parts.push(
      language === "ru"
        ? `Модуль ${compactId(scope.moduleId)}`
        : `Module ${compactId(scope.moduleId)}`,
    );
  }
  if (scope.lessonId) {
    parts.push(
      language === "ru"
        ? `Урок ${compactId(scope.lessonId)}`
        : `Lesson ${compactId(scope.lessonId)}`,
    );
  }
  return parts.join(" • ");
}

export default async function SimulationV2Page({
  searchParams,
}: SimulationPageProps) {
  const params = await searchParams;
  const language = resolveLanguage(params.lang);
  const scope = buildSimulationScope({
    courseId: params.courseId,
    moduleId: params.moduleId,
    lessonId: params.lessonId,
  });

  const cookieStore = await cookies();
  const accessToken =
    cookieStore.get(ADMIN_ACCESS_COOKIE)?.value ??
    process.env.WEB_ADMIN_ACCESS_TOKEN ??
    "";

  if (!accessToken) {
    redirect(`/auth?lang=${language}`);
  }

  let profile;
  try {
    profile = await fetchAdminAuthMeServer(accessToken);
  } catch {
    redirect(`/auth?lang=${language}`);
  }

  if (!profile.permissions.includes("simulation.builder")) {
    redirect(`/dashboard?lang=${language}`);
  }

  const scopeLabel = formatScopeLabel(language, scope);

  return (
    <main className={styles.page}>
      <SimulationEditor
        language={language}
        scopeKey={scope.scopeKey}
        scopeLabel={scopeLabel}
        courseId={scope.courseId}
      />
    </main>
  );
}
