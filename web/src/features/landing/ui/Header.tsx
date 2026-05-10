"use client";

import Link from "next/link";

import { ProsvetLogo } from "./ProsvetLogo";

const navLinks = [
  { href: "#features", label: "Возможности" },
  { href: "#about", label: "О платформе" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Просвет — на главную" className="shrink-0">
          <ProsvetLogo
            size={36}
            textClassName="text-lg font-extrabold tracking-tight text-slate-900"
          />
        </Link>

        <nav
          aria-label="Основная навигация"
          className="hidden items-center gap-7 md:flex"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-slate-600 transition hover:text-brand-600"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <Link
          href="/auth"
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-brand-500 px-5 py-2 text-sm font-bold text-white shadow-sm shadow-brand-500/20 transition hover:bg-brand-600"
        >
          Войти
        </Link>
      </div>
    </header>
  );
}
