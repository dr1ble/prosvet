"use client";

import { useMemo } from "react";
import type { AppScreen } from "../types";
import styles from "./AppScreensTab.module.css";

type AppScreensTabProps = {
  language: "ru" | "en";
  screens: AppScreen[];
  onAddScreen: (screen: AppScreen) => void;
  isLoading?: boolean;
};

export function AppScreensTab({
  language,
  screens,
  onAddScreen,
  isLoading = false,
}: AppScreensTabProps) {
  const labels = useMemo(
    () =>
      language === "ru"
        ? {
            title: "Экраны приложения",
            empty: "Загрузите изображения во вкладке «Медиа»",
            add: "Добавить",
          }
        : {
            title: "App Screens",
            empty: "Upload images in «Media» tab",
            add: "Add",
          },
    [language],
  );

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h4 className={styles.title}>{labels.title}</h4>
        <p className={styles.loading}>
          {language === "ru" ? "Загрузка..." : "Loading..."}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{labels.title}</h4>

      {screens.length === 0 ? (
        <p className={styles.empty}>{labels.empty}</p>
      ) : (
        <ul className={styles.list}>
          {screens.map((screen) => (
            <li key={screen.id} className={styles.item}>
              <div className={styles.thumbnail}>
                {screen.imageUrl ? (
                  <img
                    src={screen.imageUrl}
                    alt={screen.title || screen.key}
                    className={styles.image}
                  />
                ) : (
                  <div className={styles.placeholder}>?</div>
                )}
              </div>
              <div className={styles.info}>
                <span className={styles.screenTitle}>
                  {screen.title || screen.key}
                </span>
                <button
                  className={styles.addButton}
                  onClick={() => onAddScreen(screen)}
                >
                  {labels.add}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
