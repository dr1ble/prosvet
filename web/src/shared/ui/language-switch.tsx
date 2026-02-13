import Link from "next/link";

import type { AppLanguage } from "@/shared/i18n/lang";

import styles from "./language-switch.module.css";

type LanguageSwitchProps = {
  currentLanguage: AppLanguage;
  ruHref: string;
  enHref: string;
  label: string;
};

export function LanguageSwitch({
  currentLanguage,
  ruHref,
  enHref,
  label,
}: LanguageSwitchProps) {
  return (
    <nav aria-label={label} className={styles.switch}>
      <Link
        href={ruHref}
        className={`${styles.option} ${currentLanguage === "ru" ? styles.optionActive : ""}`}
      >
        RU
      </Link>
      <Link
        href={enHref}
        className={`${styles.option} ${currentLanguage === "en" ? styles.optionActive : ""}`}
      >
        EN
      </Link>
    </nav>
  );
}
