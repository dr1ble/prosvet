import { AlertTriangle } from "lucide-react";

import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Удалить",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <AlertTriangle size={20} className={styles.icon} />
          <h3>{title}</h3>
        </div>
        <p className={styles.message}>{message}</p>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Отмена
          </button>
          <button
            className={`${styles.confirmBtn} ${danger ? styles.danger : ""}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
