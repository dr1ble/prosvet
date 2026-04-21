"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createCourse } from "@/features/course-builder/api";

import styles from "./page.module.css";

function buildAutoSlug(): string {
  return `course-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function CourseBuilderNewPage() {
  const router = useRouter();
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function run() {
      try {
        const course = await createCourse({
          title: "Новый курс",
          slug: buildAutoSlug(),
          status: "draft",
        });
        router.replace(`/course-builder/${course.id}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Не удалось создать курс",
        );
      }
    }

    void run();
  }, [router]);

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Создаем новый курс...</h1>
        <p className={styles.subtitle}>Сейчас откроем редактор конструктора.</p>
        {error && (
          <>
            <p className={styles.error}>{error}</p>
            <Link className={styles.backLink} href="/catalog">
              ← Назад в каталог
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
