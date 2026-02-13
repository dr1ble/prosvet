"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, Star } from "lucide-react";

const trustMetrics = [
  { value: "4,9 из 5", label: "средний рейтинг" },
  { value: "120+", label: "интерактивных курсов" },
  { value: "50 тыс.", label: "активных студентов" },
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-4 pb-10 pt-10 sm:px-6 sm:pb-12 sm:pt-12 lg:pb-14 lg:pt-14">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-grid" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white via-slate-50 to-slate-100/60" />
      <div className="pointer-events-none absolute -left-24 top-12 -z-10 h-72 w-72 rounded-full bg-brand-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-6 -z-10 h-72 w-72 rounded-full bg-cta-500/20 blur-3xl" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            <span className="inline-flex h-2 w-2 rounded-full bg-brand-500" />
            Просвет для цифровой грамотности
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-balance text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl md:text-6xl"
          >
            Обучение в формате
            <span className="block bg-gradient-to-r from-brand-500 to-cta-500 bg-clip-text text-transparent">
              пошаговой траектории
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-6 max-w-2xl text-balance text-lg leading-8 text-slate-600"
          >
            Видео, интерактивные симуляции и проверка знаний в едином ритме.
            Курсы для корпоративных команд и индивидуального пути развития.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              href="/auth"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-7 py-3 text-base font-bold text-white transition hover:-translate-y-0.5 hover:bg-brand-500"
            >
              Открыть консоль
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-3 text-base font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-brand-500/40"
            >
              <PlayCircle className="h-5 w-5 text-brand-500" />
              Посмотреть возможности
            </a>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="mt-9 grid gap-3 text-sm text-slate-600 sm:grid-cols-3"
          >
            {trustMetrics.map((item) => (
              <li
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <p className="text-xl font-extrabold text-slate-900">
                  {item.value}
                </p>
                <p className="mt-1 leading-5">{item.label}</p>
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.16 }}
          className="relative"
        >
          <div className="absolute -left-8 -top-8 h-36 w-36 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="absolute -bottom-10 right-2 h-44 w-44 rounded-full bg-cta-500/20 blur-3xl" />

          <article className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-300/30">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">
                Сегодняшний путь
              </p>
              <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                45 мин
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-brand-500/25 bg-brand-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  Шаг 1
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  Видеомодуль: Фишинг и социальная инженерия
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Шаг 2
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  Симуляция: разбор инцидента в почте
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Шаг 3
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  Тест и персональная памятка
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white">
              <p className="text-sm font-semibold">Прогресс за неделю</p>
              <p className="inline-flex items-center gap-1 text-sm font-bold">
                <Star className="h-4 w-4 text-amber-400" />
                +28%
              </p>
            </div>
          </article>
        </motion.div>
      </div>
    </section>
  );
}
