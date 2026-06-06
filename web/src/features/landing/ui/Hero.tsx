"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-72px)] items-start overflow-hidden px-4 pb-12 pt-8 sm:px-6 sm:pb-14 sm:pt-10 lg:pb-16 lg:pt-10">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-grid" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-white via-slate-50 to-slate-100/60" />
      <div className="pointer-events-none absolute -left-32 top-0 -z-10 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-20 -z-10 h-80 w-80 rounded-full bg-cta-500/20 blur-3xl" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
        <div className="lg:max-w-[640px]">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            <ShieldCheck className="h-4 w-4 text-brand-500" />
            Социальный цифровой проект
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="hyphens-none text-[2.5rem] font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.04] lg:text-[3.5rem]"
          >
            <span className="block">Учим старшее поколение пользоваться</span>
            <span className="block bg-gradient-to-r from-brand-500 to-cta-500 bg-clip-text text-transparent">
              цифровыми сервисами
            </span>
            <span className="block">без риска ошибиться</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="mt-7 max-w-xl text-pretty text-lg leading-8 text-slate-600 lg:text-xl lg:leading-9"
          >
            Безопасные симуляции Госуслуг, банков и городских сервисов,
            видеоуроки и памятки — в мобильном приложении и под сопровождением
            кураторов.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <a
              href="#features"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-900 px-7 py-3 text-base font-bold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-brand-600"
            >
              Узнать возможности
            </a>
            <a
              href="#about"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-3 text-base font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-brand-500/40"
            >
              О платформе
            </a>
          </motion.div>
        </div>

        <PhoneFan />
      </div>
    </section>
  );
}

function PhoneFan() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.2 }}
      className="relative mx-auto h-[560px] w-full max-w-[510px] sm:h-[600px] lg:-mt-6"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="absolute right-2 top-1/3 h-56 w-56 rounded-full bg-cta-500/20 blur-3xl" />
      </div>

      <FanPhone
        side="left"
        rotate={-10}
        offsetY={28}
        z={1}
        delay={0}
        buttonsSide="left"
      >
        <ScreenshotImage src="/mockups/learning.png" alt="Каталог обучения" />
      </FanPhone>

      <FanPhone
        side="right"
        rotate={10}
        offsetY={28}
        z={2}
        delay={0.1}
        buttonsSide="right"
      >
        <ScreenshotImage src="/mockups/profile-20260616.png" alt="Профиль и прогресс" />
      </FanPhone>

      <FanPhone
        side="center"
        rotate={0}
        offsetY={56}
        z={3}
        delay={0.2}
        buttonsSide="right"
      >
        <ScreenshotImage
          src="/mockups/welcome.png"
          alt="Добро пожаловать в Просвет"
        />
      </FanPhone>
    </motion.div>
  );
}

function FanPhone({
  children,
  side,
  rotate,
  offsetY,
  z,
  delay,
  buttonsSide,
}: {
  children: React.ReactNode;
  side: "left" | "center" | "right";
  rotate: number;
  offsetY: number;
  z: number;
  delay: number;
  buttonsSide: "left" | "right";
}) {
  const positionClass =
    side === "left"
      ? "left-0 bottom-0"
      : side === "right"
        ? "right-0 bottom-0"
        : "left-1/2 bottom-0";

  const restingX = side === "center" ? "-50%" : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotate: rotate * 0.5, x: restingX }}
      animate={{ opacity: 1, y: -offsetY, rotate, x: restingX }}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      className={`absolute ${positionClass}`}
      style={{ zIndex: z, transformOrigin: "bottom center" }}
    >
      <PhoneDevice buttonsSide={buttonsSide}>{children}</PhoneDevice>
    </motion.div>
  );
}

function PhoneDevice({
  children,
  buttonsSide,
}: {
  children: React.ReactNode;
  buttonsSide: "left" | "right";
}) {
  return (
    <div className="relative h-[480px] w-[234px]">
      {/* Side buttons */}
      {buttonsSide === "left" ? (
        <>
          <span className="absolute -left-[3px] top-[88px] h-7 w-[3px] rounded-l bg-slate-700" />
          <span className="absolute -left-[3px] top-[132px] h-11 w-[3px] rounded-l bg-slate-700" />
          <span className="absolute -left-[3px] top-[188px] h-11 w-[3px] rounded-l bg-slate-700" />
          <span className="absolute -right-[3px] top-[142px] h-16 w-[3px] rounded-r bg-slate-700" />
        </>
      ) : (
        <>
          <span className="absolute -right-[3px] top-[88px] h-7 w-[3px] rounded-r bg-slate-700" />
          <span className="absolute -right-[3px] top-[132px] h-11 w-[3px] rounded-r bg-slate-700" />
          <span className="absolute -right-[3px] top-[188px] h-11 w-[3px] rounded-r bg-slate-700" />
          <span className="absolute -left-[3px] top-[142px] h-16 w-[3px] rounded-l bg-slate-700" />
        </>
      )}

      {/* Outer frame: titanium-like gradient */}
      <div className="relative h-full w-full rounded-[2.6rem] bg-gradient-to-br from-slate-800 via-slate-900 to-black p-[10px] shadow-[0_30px_60px_-15px_rgba(15,23,42,0.55),0_8px_24px_-8px_rgba(15,23,42,0.45)] ring-1 ring-black/40">
        {/* Inner bezel highlight */}
        <div className="absolute inset-0 rounded-[2.6rem] ring-1 ring-inset ring-white/10" />

        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-[#f7f9fb]">
          {/* Screen content */}
          <div className="relative z-10 h-full w-full">{children}</div>

          {/* Glossy reflection */}
          <div className="pointer-events-none absolute inset-0 z-20 rounded-[2rem] bg-gradient-to-br from-white/20 via-transparent to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-1/3 rounded-r-[2rem] bg-gradient-to-l from-white/10 to-transparent" />
        </div>
      </div>
    </div>
  );
}

function ScreenshotImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="234px"
      priority
      className="object-cover"
    />
  );
}
