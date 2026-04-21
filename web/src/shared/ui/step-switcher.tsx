import { cx } from "@/shared/ui/classnames";

import styles from "./primitives.module.css";

export type StepItem = {
  id: string;
  label: string;
  disabled?: boolean;
};

type StepSwitcherProps = {
  items: StepItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
};

export function StepSwitcher({
  items,
  activeId,
  onSelect,
  className,
}: StepSwitcherProps) {
  return (
    <div className={cx(styles.stepSwitcher, className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={cx(
            styles.stepItem,
            item.id === activeId ? styles.stepItemActive : "",
          )}
          disabled={item.disabled}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
