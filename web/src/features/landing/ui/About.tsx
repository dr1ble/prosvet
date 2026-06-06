"use client";

import { motion } from "framer-motion";

export function About() {
  return (
    <section
      id="about"
      className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-14"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white via-slate-50 to-slate-100/70" />

      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <motion.article
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-[2rem] border border-slate-200 bg-slate-900 p-7 text-white shadow-2xl shadow-slate-900/15 sm:p-8"
        >
          <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-semibold uppercase tracking-[0.12em] text-white/90">
            Отзывы площадок
          </p>
          <blockquote className="mt-6 text-xl leading-9 text-white/95 sm:text-[1.65rem]">
            &ldquo;После запуска платформы участники стали увереннее
            пользоваться Госуслугами и онлайн-банком. Прогресс стал прозрачным,
            и поддержка приходит вовремя.&rdquo;
          </blockquote>
          <div className="mt-7 border-t border-white/20 pt-5">
            <p className="text-base font-semibold">
              Центр активного долголетия
            </p>
            <p className="text-base text-white/70">
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
          <p className="text-base font-semibold uppercase tracking-[0.12em] text-brand-600">
            О платформе
          </p>
          <h2 className="mt-3 max-w-xl text-balance text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Социальный эффект, а не просто набор учебных инструментов
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
            «Просвет» помогает людям старшего возраста осваивать цифровые
            сервисы спокойно, пошагово и без страха ошибки. Платформа создаёт
            безопасную среду, в которой навык можно сначала понять, затем
            отработать и только после этого перенести в реальную жизнь.
          </p>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
            Для центров долголетия, НКО и социальных программ это способ
            выстроить системную поддержку: сопровождать участников, видеть
            прогресс и расширять обучение без постоянного роста нагрузки на
            сотрудников.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
