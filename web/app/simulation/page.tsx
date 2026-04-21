import { redirect } from "next/navigation";

import { resolveLanguage } from "@/shared/i18n/lang";

type SimulationPageProps = {
  searchParams: Promise<{
    lang?: string;
    courseId?: string;
    moduleId?: string;
    lessonId?: string;
  }>;
};

export default async function SimulationPage({
  searchParams,
}: SimulationPageProps) {
  const params = await searchParams;
  const language = resolveLanguage(params.lang);
  const nextQuery = new URLSearchParams({
    lang: language,
  });
  if (params.courseId) {
    nextQuery.set("courseId", params.courseId);
  }
  if (params.moduleId) {
    nextQuery.set("moduleId", params.moduleId);
  }
  if (params.lessonId) {
    nextQuery.set("lessonId", params.lessonId);
  }

  redirect(`/simulation-v2?${nextQuery.toString()}`);
}
