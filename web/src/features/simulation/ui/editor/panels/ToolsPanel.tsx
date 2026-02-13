"use client";

import { useState, useMemo, type ReactNode } from "react";
import styles from "./ToolsPanel.module.css";

type TabId = "screens" | "appMedia" | "library";

type ToolsPanelProps = {
  language: "ru" | "en";
  screensTab: ReactNode;
  appMediaTab: ReactNode;
  libraryTab: ReactNode;
};

function TabIcon({ id }: { id: TabId }) {
  if (id === "appMedia") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="2.5" width="17" height="19" rx="3" />
        <circle cx="12" cy="17.5" r="1.2" />
        <path d="M9 6.5h6" />
      </svg>
    );
  }
  if (id === "screens") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="18" height="14" rx="2.5" />
        <path d="M8 20h8" />
        <path d="M12 18v2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="7" height="6" rx="1.5" />
      <rect x="14" y="5" width="7" height="6" rx="1.5" />
      <rect x="3" y="13" width="7" height="6" rx="1.5" />
      <rect x="14" y="13" width="7" height="6" rx="1.5" />
    </svg>
  );
}

export function ToolsPanel({
  language,
  screensTab,
  appMediaTab,
  libraryTab,
}: ToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("appMedia");

  const labels = useMemo(
    () =>
      language === "ru"
        ? {
            screens: {
              short: "Редактор",
              description: "Экранный редактор сценария",
            },
            appMedia: {
              short: "Приложения",
              description: "Приложения и медиаэкраны",
            },
            library: {
              short: "Библиотека",
              description: "Библиотека сценариев",
            },
          }
        : {
            screens: {
              short: "Editor",
              description: "Scenario screen editor",
            },
            appMedia: {
              short: "Apps",
              description: "Applications and media screens",
            },
            library: {
              short: "Library",
              description: "Scenario library",
            },
          },
    [language],
  );

  const tabs: {
    id: TabId;
    label: string;
    description: string;
    content: ReactNode;
  }[] = [
    {
      id: "appMedia",
      label: labels.appMedia.short,
      description: labels.appMedia.description,
      content: appMediaTab,
    },
    {
      id: "screens",
      label: labels.screens.short,
      description: labels.screens.description,
      content: screensTab,
    },
    {
      id: "library",
      label: labels.library.short,
      description: labels.library.description,
      content: libraryTab,
    },
  ];

  return (
    <div className={styles.panel}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.description}
            aria-label={tab.description}
          >
            <span className={styles.tabIcon} aria-hidden="true">
              <TabIcon id={tab.id} />
            </span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.content}>
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </div>
  );
}
