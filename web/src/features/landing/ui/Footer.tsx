import { Github, Linkedin, Mail, Twitter } from "lucide-react";

const socialLinks = [
  { href: "https://twitter.com", label: "Канал новостей", Icon: Twitter },
  { href: "https://github.com", label: "Репозиторий", Icon: Github },
  { href: "https://linkedin.com", label: "Профиль команды", Icon: Linkedin },
  {
    href: "mailto:hello@digitaledu.local",
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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">
              Просвет
            </p>
            <h3 className="mt-3 text-2xl font-extrabold text-white">
              Обучайте быстрее. Проверяйте точнее.
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Единая среда для курса, симуляции и оценки навыков. Запускается
              как для одной команды, так и для всей компании.
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
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition hover:border-brand-300 hover:bg-brand-500/20"
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
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
