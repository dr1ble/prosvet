"use client";

import { useState } from "react";

import { logoutAdminSession } from "@/features/auth/api";
import type { AppLanguage } from "@/shared/i18n/lang";

type LogoutActionButtonProps = {
  language: AppLanguage;
  className?: string;
  label: string;
  pendingLabel: string;
};

export function LogoutActionButton({
  language,
  className,
  label,
  pendingLabel,
}: LogoutActionButtonProps) {
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    if (pending) {
      return;
    }
    setPending(true);
    try {
      await logoutAdminSession();
    } finally {
      window.location.assign(`/auth?lang=${language}`);
    }
  };

  return (
    <button
      className={className}
      type="button"
      onClick={handleLogout}
      disabled={pending}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
