"use client";

import { useSyncExternalStore } from "react";

import styles from "./profile-avatar-badge.module.css";

const AVATAR_PRESETS = ["🙂", "👩‍🏫", "🧑‍💻", "📚", "⭐", "🧩"];

type ProfileAvatarBadgeProps = {
  userKey: string;
  fallback: string;
  className?: string;
  value?: string;
};

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

export function ProfileAvatarBadge({
  userKey,
  fallback,
  className,
  value,
}: ProfileAvatarBadgeProps) {
  const storageKey = `dashboard-avatar-${userKey}`;
  const selected = useSyncExternalStore(
    subscribeToAvatar,
    () => readAvatar(storageKey),
    () => "",
  );

  return (
    <span className={`${styles.badge} ${className ?? ""}`.trim()}>
      {value || selected || fallback}
    </span>
  );
}
