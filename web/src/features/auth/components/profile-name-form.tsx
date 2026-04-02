"use client";

import { FormEvent, useState } from "react";

import { updateAdminProfile } from "@/features/auth/api";
import type { AppLanguage } from "@/shared/i18n/lang";
import { toUserErrorMessage } from "@/shared/lib/api-error";

import styles from "./profile-name-form.module.css";

type ProfileNameFormProps = {
  language: AppLanguage;
  initialValue: string;
};

export function ProfileNameForm({
  language,
  initialValue,
}: ProfileNameFormProps) {
  const [value, setValue] = useState(initialValue);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveLabel = language === "ru" ? "Сохранить имя" : "Save name";
  const savingLabel = language === "ru" ? "Сохранение..." : "Saving...";
  const label = language === "ru" ? "Имя профиля" : "Profile name";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await updateAdminProfile({ display_name: value.trim() || null });
      window.location.assign(`/dashboard?lang=${language}&modal=profile`);
    } catch (requestError) {
      setError(
        toUserErrorMessage(
          requestError,
          language === "ru"
            ? "Не удалось обновить имя профиля."
            : "Failed to update profile name.",
        ),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span>{label}</span>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={255}
        />
      </label>
      <button className={styles.button} type="submit" disabled={pending}>
        {pending ? savingLabel : saveLabel}
      </button>
      {error ? <p className={styles.error}>{error}</p> : null}
    </form>
  );
}
