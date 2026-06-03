import { Github, Mail } from "lucide-react";
import type { ComponentType } from "react";

import { ProsvetLogo } from "./ProsvetLogo";

type SocialIcon = ComponentType<{ className?: string }>;

type SocialLink = {
  href: string;
  label: string;
  Icon: SocialIcon;
};

const socialLinks: SocialLink[] = [
  {
    href: "https://github.com/dr1ble/prosvet",
    label: "Репозиторий GitHub",
    Icon: Github,
  },
  {
    href: "mailto:prosvet-edu@mail.ru",
    label: "Электронная почта",
    Icon: Mail,
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-slate-950 px-4 py-10 text-slate-200 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute -left-16 top-0 h-60 w-60 rounded-full bg-brand-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 right-0 h-60 w-60 rounded-full bg-cta-500/20 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col justify-between gap-7 border-b border-white/10 pb-7 md:flex-row md:items-end">
          <div className="max-w-md">
            <ProsvetLogo
              size={36}
              textClassName="text-2xl font-extrabold tracking-tight text-white"
            />
            <h3 className="mt-4 text-[1.75rem] font-extrabold leading-tight text-white sm:text-[2rem]">
              Цифровая поддержка старшего поколения.
            </h3>
            <p className="mt-3 text-base leading-8 text-slate-300 sm:text-lg">
              Единая платформа для социальных учреждений, НКО и муниципальных
              программ, а также для самостоятельного прохождения гражданами:
              обучение, симуляции и сопровождение.
            </p>
          </div>

          <nav
            aria-label="Социальные ссылки"
            className="flex flex-wrap items-center gap-3"
          >
            {socialLinks.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noreferrer" : undefined}
                aria-label={label}
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition hover:border-brand-300 hover:bg-brand-500/20"
              >
                <Icon className="h-[1.375rem] w-[1.375rem]" />
              </a>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3 text-base text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Просвет</p>
          <div className="flex flex-wrap gap-5">
            <a href="#" className="transition hover:text-white">
              Политика конфиденциальности
            </a>
            <a href="#" className="transition hover:text-white">
              Условия использования
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
