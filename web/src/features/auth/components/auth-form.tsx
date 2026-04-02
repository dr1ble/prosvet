"use client";

import { FormEvent, useState } from "react";

import { loginAdmin } from "@/features/auth/api";
import { toUserErrorMessage } from "@/shared/lib/api-error";
import type { AppLanguage } from "@/shared/i18n/lang";
import { getUiMessages } from "@/shared/i18n/messages";

import styles from "../../../../app/auth/auth.module.css";

type AuthFormProps = {
  language: AppLanguage;
};

export function AuthForm({ language }: AuthFormProps) {
  const messages = getUiMessages(language);

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await loginAdmin(login.trim(), password);
      window.location.assign(`/dashboard?lang=${language}`);
    } catch (requestError) {
      setError(toUserErrorMessage(requestError, messages.auth.signInError));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <form className={styles.form} onSubmit={handleSignIn}>
        <label className={styles.field}>
          <span>{messages.auth.loginLabel}</span>
          <input
            className={styles.input}
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            placeholder="admin"
            required
          />
        </label>
        <label className={styles.field}>
          <span>{messages.auth.passwordLabel}</span>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="********"
            required
          />
        </label>
        <button className={styles.button} type="submit" disabled={pending}>
          {pending ? messages.auth.signingIn : messages.auth.signIn}
        </button>
      </form>
      {error && <p className={styles.error}>{error}</p>}
    </>
  );
}
