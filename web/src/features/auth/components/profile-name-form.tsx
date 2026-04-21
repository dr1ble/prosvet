"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { updateAdminProfile } from "@/features/auth/api";
import type { AppLanguage } from "@/shared/i18n/lang";
import { toUserErrorMessage } from "@/shared/lib/api-error";

import styles from "./profile-name-form.module.css";

type ProfileNameFormProps = {
  language: AppLanguage;
  initialValue: string;
  hideSubmit?: boolean;
};

export function ProfileNameForm({
  language,
  initialValue,
  hideSubmit = false,
}: ProfileNameFormProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const saveLabel = language === "ru" ? "Сохранить имя" : "Save name";
  const savingLabel = language === "ru" ? "Сохранение..." : "Saving...";
  const label = language === "ru" ? "Имя профиля" : "Profile name";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await updateAdminProfile({ display_name: value.trim() || null });
      setSaved(true);
      router.refresh();
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
        <div className={styles.inputWrap}>
          <input
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setSaved(false);
            }}
            maxLength={255}
          />
          {!hideSubmit && (
            <button
              className={`${styles.iconButton} ${saved ? styles.iconButtonSaved : ""}`}
              type="submit"
              disabled={pending}
              aria-label={pending ? savingLabel : saveLabel}
            >
              {pending ? "..." : saved ? "✓" : "✓"}
            </button>
          )}
        </div>
      </label>
      {error ? <p className={styles.error}>{error}</p> : null}
    </form>
  );
}
