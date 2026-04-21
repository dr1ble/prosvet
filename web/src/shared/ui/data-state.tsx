import { ReactNode } from "react";

import { cx } from "./classnames";
import styles from "./data-state.module.css";

type DataStateProps = {
  title: string;
  description: string;
  tone?: "neutral" | "error" | "loading";
  compact?: boolean;
  className?: string;
  role?: "status" | "alert";
  action?: ReactNode;
};

export function DataState({
  title,
  description,
  tone = "neutral",
  compact = false,
  className,
  role,
  action,
}: DataStateProps) {
  return (
    <div
      className={cx(
        styles.state,
        compact && styles.compact,
        tone === "error" && styles.error,
        tone === "loading" && styles.loading,
        className,
      )}
      role={role}
    >
      <p className={styles.title}>{title}</p>
      <p className={styles.description}>{description}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
