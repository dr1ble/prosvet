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
            screens: "Сценарий",
            appMedia: "Приложение и медиа",
            library: "Сценарии",
          }
        : {
            screens: "Scenario",
            appMedia: "App and Media",
            library: "Scenarios",
          },
    [language],
  );

  const tabs: { id: TabId; label: string; content: ReactNode }[] = [
    { id: "appMedia", label: labels.appMedia, content: appMediaTab },
    { id: "screens", label: labels.screens, content: screensTab },
    { id: "library", label: labels.library, content: libraryTab },
  ];

  return (
    <div className={styles.panel}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.content}>
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </div>
  );
}
