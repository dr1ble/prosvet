"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Award, BookOpen, Smartphone, Sparkles, Users } from "lucide-react";

interface FeatureCard {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  className: string;
}

const featureCards: FeatureCard[] = [
  {
    title: "Пошаговая траектория обучения",
    description:
      "Структура «видео -> симуляция -> квиз -> памятка» держит фокус и помогает быстро закреплять навык.",
    icon: BookOpen,
    accent: "bg-brand-500/15 text-brand-600",
    className: "lg:col-span-2 lg:min-h-[19rem]",
  },
  {
    title: "Мобильный ритм",
    description:
      "Стартуйте на десктопе, продолжайте на телефоне без потери прогресса.",
    icon: Smartphone,
    accent: "bg-sky-500/15 text-sky-600",
    className: "md:col-span-1",
  },
  {
    title: "Командная аналитика",
    description:
      "Руководитель видит динамику прохождения и зоны риска по каждой группе.",
    icon: Users,
    accent: "bg-indigo-500/15 text-indigo-600",
    className: "md:col-span-1",
  },
  {
    title: "Сертификация",
    description:
      "Отчеты и подтверждение компетенций для внутренней аттестации и найма.",
    icon: Award,
    accent: "bg-amber-500/15 text-amber-600",
    className: "md:col-span-1",
  },
  {
    title: "ИИ-подсказки",
    description:
      "Персональные рекомендации и уточнение ошибок по итогам симуляции.",
    icon: Sparkles,
    accent: "bg-orange-500/15 text-orange-600",
    className: "md:col-span-1",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-14"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-slate-100/30 via-white to-slate-100/50" />
      <div className="pointer-events-none absolute -right-20 top-1/2 -z-10 h-72 w-72 -translate-y-1/2 rounded-full bg-brand-300/25 blur-3xl" />

      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mb-8 flex flex-col justify-between gap-4 md:mb-10 md:flex-row md:items-end"
        >
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-600">
              Ключевые модули
            </p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Платформа для обучения, которая двигает команду вперед
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-slate-600">
            Мы собрали инструменты для авторов, методологов и студентов в одном
            интерфейсе без разрыва контекста.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.article
                key={card.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={`${card.className} h-full min-h-56 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/35 transition hover:-translate-y-1 hover:shadow-xl`}
              >
                <div
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${card.accent}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {card.description}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
