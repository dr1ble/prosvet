"use client";

import { useMemo } from "react";
import type { SimulationPresetId } from "@/features/simulation/model/factories";
import styles from "./PresetsTab.module.css";

type PresetsTabProps = {
  language: "ru" | "en";
  onApplyPreset: (presetId: SimulationPresetId) => void;
};

const PRESETS: {
  id: SimulationPresetId;
  icon: string;
  titleRu: string;
  titleEn: string;
  descRu: string;
  descEn: string;
}[] = [
  {
    id: "blank",
    icon: "📄",
    titleRu: "Пустой сценарий",
    titleEn: "Blank scenario",
    descRu: "Начните с чистого листа",
    descEn: "Start from scratch",
  },
  {
    id: "bank_payment",
    icon: "🏦",
    titleRu: "Банковский платеж",
    titleEn: "Bank payment",
    descRu: "Путь: главный экран → форма → успех",
    descEn: "Flow: home → form → success",
  },
  {
    id: "gov_services",
    icon: "🏛️",
    titleRu: "Госуслуга",
    titleEn: "Government service",
    descRu: "Путь: каталог → заявление → отправка",
    descEn: "Flow: catalog → request → submit",
  },
  {
    id: "messenger",
    icon: "💬",
    titleRu: "Отправка сообщения",
    titleEn: "Send message",
    descRu: "Путь: чаты → диалог → отправлено",
    descEn: "Flow: chats → dialog → sent",
  },
];

export function PresetsTab({ language, onApplyPreset }: PresetsTabProps) {
  const labels = useMemo(
    () =>
      language === "ru"
        ? {
            title: "Быстрый старт",
            subtitle: "Выберите шаблон для начала",
            apply: "Использовать",
          }
        : {
            title: "Quick start",
            subtitle: "Choose a template to begin",
            apply: "Use",
          },
    [language],
  );

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{labels.title}</h4>
      <p className={styles.subtitle}>{labels.subtitle}</p>

      <ul className={styles.list}>
        {PRESETS.map((preset) => (
          <li key={preset.id} className={styles.item}>
            <div className={styles.itemHeader}>
              <span className={styles.icon}>{preset.icon}</span>
              <span className={styles.itemTitle}>
                {language === "ru" ? preset.titleRu : preset.titleEn}
              </span>
            </div>
            <p className={styles.itemDesc}>
              {language === "ru" ? preset.descRu : preset.descEn}
            </p>
            <button
              className={styles.applyButton}
              onClick={() => onApplyPreset(preset.id)}
            >
              {labels.apply}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
