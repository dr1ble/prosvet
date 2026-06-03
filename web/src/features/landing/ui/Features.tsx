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
    title: "Безопасная симуляция реальных сервисов",
    description:
      "Практика на интерфейсах Госуслуг, банков и городских сервисов без риска реальных операций.",
    icon: BookOpen,
    accent: "bg-brand-500/15 text-brand-600",
    className: "lg:col-span-2 lg:min-h-[19rem]",
  },
  {
    title: "No-Code конструктор сценариев",
    description:
      "Методист центра собирает уроки из шагов видео, симуляция, квиз и памятка без программирования.",
    icon: Smartphone,
    accent: "bg-sky-500/15 text-sky-600",
    className: "md:col-span-1",
  },
  {
    title: "Адаптация интерфейса для старшего поколения",
    description:
      "Крупные элементы, высокая контрастность и простая навигация снижают барьер входа для старшего поколения.",
    icon: Users,
    accent: "bg-indigo-500/15 text-indigo-600",
    className: "md:col-span-1",
  },
  {
    title: "Кроссплатформенный доступ",
    description:
      "Мобильное приложение для граждан и веб-панель для кураторов работают в едином контуре контента.",
    icon: Award,
    accent: "bg-amber-500/15 text-amber-600",
    className: "md:col-span-1",
  },
  {
    title: "Аналитика прогресса",
    description:
      "Платформа фиксирует прохождение и результаты, чтобы социальные службы видели динамику освоения навыков.",
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
              Ключевые возможности
            </p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Платформа для центров долголетия и социальных программ
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-slate-600">
            Единая система для обучения, сопровождения и оценки цифровой
            самостоятельности граждан старшего возраста.
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
                className={`${card.className} h-full min-h-56 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/35 transition hover:-translate-y-1 hover:shadow-xl sm:p-7`}
              >
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${card.accent} sm:h-[3.25rem] sm:w-[3.25rem]`}
                >
                  <Icon className="h-6 w-6 sm:h-[1.625rem] sm:w-[1.625rem]" />
                </div>
                <h3 className="mt-5 text-xl font-bold leading-tight text-slate-900 sm:mt-6 sm:text-[1.6rem]">
                  {card.title}
                </h3>
                <p className="mt-3 text-[0.95rem] leading-7 text-slate-600 sm:text-base sm:leading-7">
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
