import { AuthForm } from "@/features/auth/components/auth-form";
import { resolveLanguage } from "@/shared/i18n/lang";
import { getUiMessages } from "@/shared/i18n/messages";

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
        <div className={`${styles.blob} ${styles.blobMain}`} />
        <div className={`${styles.blob} ${styles.blobAccent}`} />
        <div className={styles.grid} />
      </div>

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
