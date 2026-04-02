"use client";

import { useSyncExternalStore } from "react";

import { ProfileAvatarBadge } from "./profile-avatar-badge";
import styles from "./profile-avatar-picker.module.css";

const AVATAR_PRESETS = ["🙂", "👩‍🏫", "🧑‍💻", "📚", "⭐", "🧩"];

function subscribeToAvatar(onStoreChange: () => void): () => void {
  window.addEventListener("dashboard-avatar-updated", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("dashboard-avatar-updated", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readAvatar(storageKey: string): string {
  const saved = window.localStorage.getItem(storageKey);
  if (saved && AVATAR_PRESETS.includes(saved)) {
    return saved;
  }
  return "";
}

type ProfileAvatarPickerProps = {
  userKey: string;
  fallbackInitials: string;
  title: string;
};

export function ProfileAvatarPicker({
  userKey,
  fallbackInitials,
  title,
}: ProfileAvatarPickerProps) {
  const storageKey = `dashboard-avatar-${userKey}`;
  const selected = useSyncExternalStore(
    subscribeToAvatar,
    () => readAvatar(storageKey),
    () => "",
  );

  const applyAvatar = (avatar: string) => {
    window.localStorage.setItem(storageKey, avatar);
    window.dispatchEvent(new Event("dashboard-avatar-updated"));
  };

  return (
    <div className={styles.wrap}>
      <p className={styles.title}>{title}</p>
      <ProfileAvatarBadge
        userKey={userKey}
        fallback={fallbackInitials}
        className={styles.mainAvatar}
        value={selected}
      />
      <div className={styles.row}>
        {AVATAR_PRESETS.map((avatar) => (
          <button
            key={avatar}
            type="button"
            onClick={() => applyAvatar(avatar)}
            className={`${styles.option} ${selected === avatar ? styles.optionActive : ""}`}
            aria-label={`Avatar ${avatar}`}
          >
            {avatar}
          </button>
        ))}
      </div>
    </div>
  );
}
