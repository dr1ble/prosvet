"use client";

import { useMemo, useState, useEffect } from "react";
import type { SimulationDraft } from "@/features/simulation/model/types";
import {
  fetchSimulationLibraryRemote,
  loadSimulationLibraryItemRemote,
} from "@/features/simulation/api/client";
import styles from "./LibraryTab.module.css";

type LibraryItem = {
  id: string;
  title: string;
  targetAppName: string | null;
  createdAt: string;
  updatedAt: string;
};

type LibraryTabProps = {
  language: "ru" | "en";
  scopeKey: string;
  onLoadDraft: (draft: SimulationDraft) => void;
};

export function LibraryTab({
  language,
  scopeKey,
  onLoadDraft,
}: LibraryTabProps) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadLibrary() {
      try {
        const data = await fetchSimulationLibraryRemote(scopeKey, "");
        if (mounted) {
          setItems(data);
        }
      } catch (error) {
        console.error("Failed to load library:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadLibrary();
    return () => {
      mounted = false;
    };
  }, [scopeKey]);

  const handleLoad = async (itemId: string) => {
    setLoadingId(itemId);
    try {
      const draft = await loadSimulationLibraryItemRemote(itemId);
      if (draft) {
        onLoadDraft(draft);
      }
    } catch (error) {
      console.error("Failed to load library item:", error);
    } finally {
      setLoadingId(null);
    }
  };

  const labels = useMemo(
    () =>
      language === "ru"
        ? {
            title: "Библиотека",
            empty: "Нет сохранённых сценариев",
            load: "Загрузить",
            loading: "Загрузка...",
          }
        : {
            title: "Library",
            empty: "No saved scenarios",
            load: "Load",
            loading: "Loading...",
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

      {items.length === 0 ? (
        <p className={styles.empty}>{labels.empty}</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <span className={styles.itemTitle}>
                  {item.title || "Untitled"}
                </span>
              </div>
              {item.targetAppName && (
                <p className={styles.itemMeta}>{item.targetAppName}</p>
              )}
              <button
                className={styles.loadButton}
                onClick={() => handleLoad(item.id)}
                disabled={loadingId === item.id}
              >
                {loadingId === item.id ? labels.loading : labels.load}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
