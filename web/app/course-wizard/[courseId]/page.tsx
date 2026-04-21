import { redirect } from "next/navigation";

export default async function CourseWizardPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  redirect(`/course-builder/${courseId}`);
}
