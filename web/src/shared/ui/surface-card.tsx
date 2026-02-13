import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cx } from "@/shared/ui/classnames";

import styles from "./primitives.module.css";

type SurfaceTone = "default" | "muted";

type SurfaceCardProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  tone?: SurfaceTone;
  children: ReactNode;
};

export function SurfaceCard({
  as: Component = "section",
  tone = "default",
  className,
  children,
  ...props
}: SurfaceCardProps) {
  return (
    <Component
      className={cx(
        styles.surfaceCard,
        tone === "muted" ? styles.surfaceCardMuted : "",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
