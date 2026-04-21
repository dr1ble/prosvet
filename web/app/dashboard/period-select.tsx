"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import styles from "./dashboard.module.css";

type DashboardPeriod = "all" | "7d" | "14d" | "30d" | "90d";

type PeriodSelectProps = {
  language: string;
  value: DashboardPeriod;
  label: string;
  options: ReadonlyArray<{
    value: DashboardPeriod;
    label: string;
  }>;
};

export function PeriodSelect({
  language,
  value,
  label,
  options,
}: PeriodSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className={styles.periodSelectWrap}>
      <span className={styles.periodSelectorLabel}>{label}</span>
      <select
        className={styles.periodSelect}
        value={value}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("lang", language);
          params.set("period", event.target.value);
          router.push(`${pathname}?${params.toString()}`);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
