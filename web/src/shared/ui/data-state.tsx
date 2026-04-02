import { cx } from "./classnames";
import styles from "./data-state.module.css";

type DataStateProps = {
  title: string;
  description: string;
  tone?: "neutral" | "error";
  compact?: boolean;
  className?: string;
  role?: "status" | "alert";
};

export function DataState({
  title,
  description,
  tone = "neutral",
  compact = false,
  className,
  role,
}: DataStateProps) {
  return (
    <div
      className={cx(
        styles.state,
        compact && styles.compact,
        tone === "error" && styles.error,
        className,
      )}
      role={role}
    >
      <p className={styles.title}>{title}</p>
      <p className={styles.description}>{description}</p>
    </div>
  );
}
