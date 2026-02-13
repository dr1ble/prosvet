import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";

import { cx } from "@/shared/ui/classnames";

import type { ActionVariant } from "./action-button";
import styles from "./primitives.module.css";

type ActionLinkProps = LinkProps & {
  className?: string;
  children: ReactNode;
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

export function ActionLink({
  className,
  children,
  variant = "secondary",
  ...props
}: ActionLinkProps) {
  return (
    <Link
      className={cx(styles.action, variantClass(variant), className)}
      {...props}
    >
      {children}
    </Link>
  );
}
