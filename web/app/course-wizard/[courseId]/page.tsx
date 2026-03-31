"use client";

import { useEffect, use } from "react";
import Link from "next/link";
import { useWizardStore } from "@/features/course-wizard/store";
import { StepContent } from "@/features/course-wizard/components/step-content";
import styles from "../page.module.css";

export default function CourseWizardPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const reset = useWizardStore((s) => s.reset);

  useEffect(() => {
    reset();
    return () => {
      reset();
    };
  }, [reset]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <p className={styles.kicker}>Конструктор</p>
          <h1 className={styles.title}>Создание курса</h1>
          <p className={styles.subtitle}>
            Пошаговый мастер: заполните информацию, добавьте уроки и модули,
            затем опубликуйте курс для мобильного приложения.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.backLink} href="/catalog">
            ← Назад в каталог
          </Link>
        </div>
      </header>

      <section className={styles.workspace}>
        <StepContent courseId={courseId} />
      </section>
    </main>
  );
}
