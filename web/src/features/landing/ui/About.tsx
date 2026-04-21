"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const metrics = [
  { value: "100%", label: "ориентация на граждан старшего возраста" },
  { value: "120+", label: "сценариев по жизненным ситуациям" },
  { value: "No-Code", label: "создание курсов и сценариев без кода" },
  { value: "24/7", label: "доступ к урокам, практике и памяткам" },
];

export function About() {
  return (
    <section className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-14">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white via-slate-50 to-slate-100/70" />

      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <motion.article
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-[2rem] border border-slate-200 bg-slate-900 p-7 text-white shadow-2xl shadow-slate-900/15 sm:p-8"
        >
          <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/90">
            Отзывы площадок
          </p>
          <blockquote className="mt-6 text-lg leading-8 text-white/95 sm:text-xl">
            &ldquo;После запуска платформы участники стали увереннее
            пользоваться Госуслугами и онлайн-банком. Прогресс стал прозрачным,
            и поддержка приходит вовремя.&rdquo;
          </blockquote>
          <div className="mt-7 border-t border-white/20 pt-5">
            <p className="text-sm font-semibold">Центр активного долголетия</p>
            <p className="text-sm text-white/70">
              Муниципальная программа цифровой адаптации
            </p>
          </div>
        </motion.article>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-600">
            Почему выбирают «Просвет»
          </p>
          <h2 className="mt-3 max-w-xl text-balance text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Поддержка цифровой самостоятельности граждан
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            Платформа сочетает обучение и безопасную практику, снижает нагрузку
            на очные консультации и помогает расширять охват без потери качества
            сопровождения участников.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {metrics.map((metric) => (
              <article
                key={metric.label}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <p className="text-2xl font-extrabold text-slate-900">
                  {metric.value}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {metric.label}
                </p>
              </article>
            ))}
          </div>

          <a
            href="/dashboard"
            className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-brand-500/50 hover:text-brand-600"
          >
            Открыть панель координатора
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
