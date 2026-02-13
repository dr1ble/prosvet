import { AuthForm } from "@/features/auth/components/auth-form";
import { resolveLanguage } from "@/shared/i18n/lang";
import { getUiMessages } from "@/shared/i18n/messages";
import { LanguageSwitch } from "@/shared/ui/language-switch";

import styles from "./auth.module.css";

type AuthPageProps = {
  searchParams: Promise<{
    lang?: string;
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const language = resolveLanguage(params.lang);
  const messages = getUiMessages(language);

  return (
    <main className={styles.page}>
      <div className={styles.background}>
        <div className={`${styles.blob} ${styles.blob1}`} />
        <div className={`${styles.blob} ${styles.blob2}`} />
      </div>
      <section className={styles.topBar}>
        <LanguageSwitch
          currentLanguage={language}
          ruHref="/auth?lang=ru"
          enHref="/auth?lang=en"
          label={messages.languageLabel}
        />
      </section>

      <section className={styles.formShell}>
        <section className={styles.card}>
          <h1 className={styles.title}>{messages.auth.title}</h1>
          <p className={styles.cardSubtitle}>{messages.auth.subtitle}</p>
          <AuthForm language={language} />
        </section>
      </section>
    </main>
  );
}
