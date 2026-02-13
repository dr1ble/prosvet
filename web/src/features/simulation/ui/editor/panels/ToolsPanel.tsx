"use client";

import { useState, useMemo, type ReactNode } from "react";
import styles from "./ToolsPanel.module.css";

type TabId = "screens" | "appScreens" | "library" | "media";

type ToolsPanelProps = {
  language: "ru" | "en";
  screensTab: ReactNode;
  appScreensTab: ReactNode;
  libraryTab: ReactNode;
  mediaTab: ReactNode;
};

export function ToolsPanel({
  language,
  screensTab,
  appScreensTab,
  libraryTab,
  mediaTab,
}: ToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("appScreens");

  const labels = useMemo(
    () =>
      language === "ru"
        ? {
            screens: "Сценарий",
            appScreens: "Экраны приложения",
            library: "Сценарии",
            media: "Медиа",
          }
        : {
            screens: "Scenario",
            appScreens: "App Screens",
            library: "Scenarios",
            media: "Media",
          },
    [language],
  );

  const tabs: { id: TabId; label: string; content: ReactNode }[] = [
    { id: "appScreens", label: labels.appScreens, content: appScreensTab },
    { id: "screens", label: labels.screens, content: screensTab },
    { id: "library", label: labels.library, content: libraryTab },
    { id: "media", label: labels.media, content: mediaTab },
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
