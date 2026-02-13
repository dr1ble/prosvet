import type { ButtonHTMLAttributes } from "react";

import { cx } from "@/shared/ui/classnames";

import styles from "./primitives.module.css";

export type ActionVariant = "primary" | "secondary" | "ghost" | "danger";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ActionVariant;
};

function variantClass(variant: ActionVariant): string {
  if (variant === "primary") {
    return styles.actionPrimary;
  }
  if (variant === "ghost") {
    return styles.actionGhost;
  }
  if (variant === "danger") {
    return styles.actionDanger;
  }
  return styles.actionSecondary;
}

export function ActionButton({
  className,
  variant = "secondary",
  type = "button",
  ...props
}: ActionButtonProps) {
  return (
    <button
      className={cx(styles.action, variantClass(variant), className)}
      type={type}
      {...props}
    />
  );
}
