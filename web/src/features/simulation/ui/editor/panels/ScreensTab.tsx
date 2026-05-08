"use client";

import { useMemo } from "react";
import type { SimulationNode, ScreenNodeData } from "../types";
import styles from "./ScreensTab.module.css";

type ScreensTabProps = {
  language: "ru" | "en";
  nodes: SimulationNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onAddScreen: () => void;
  onDeleteScreen: (nodeId: string) => void;
};

export function ScreensTab({
  language,
  nodes,
  selectedNodeId,
  onSelectNode,
  onAddScreen,
  onDeleteScreen,
}: ScreensTabProps) {
  const labels = useMemo(
    () =>
      language === "ru"
        ? {
            title: "Экраны сценария",
            addScreen: "Добавить",
            noScreens: "Нет экранов",
            untitled: "Без названия",
            start: "Начало",
            end: "Финал",
            delete: "Удалить",
          }
        : {
            title: "Scenario screens",
            addScreen: "Add",
            noScreens: "No screens",
            untitled: "Untitled",
            start: "Start",
            end: "End",
            delete: "Delete",
          },
    [language],
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>{labels.title}</h4>
        <button className={styles.addButton} onClick={onAddScreen}>
          {labels.addScreen}
        </button>
      </div>

      {nodes.length === 0 ? (
        <p className={styles.empty}>{labels.noScreens}</p>
      ) : (
        <ul className={styles.list}>
          {nodes.map((node, index) => {
            const data = node.data as ScreenNodeData;
            const number = index + 1;
            return (
              <li
                key={node.id}
                className={`${styles.item} ${selectedNodeId === node.id ? styles.itemSelected : ""}`}
                onClick={() => onSelectNode(node.id)}
              >
                <div className={styles.itemInfo}>
                  <span className={styles.itemNumber}>{number}.</span>
                  <span className={styles.itemTitle}>
                    {data.title || labels.untitled}
                  </span>
                  {data.isStart && (
                    <span className={styles.badgeStart}>{labels.start}</span>
                  )}
                  {data.isCompletion && (
                    <span className={styles.badgeEnd}>{labels.end}</span>
                  )}
                </div>
                <button
                  className={styles.deleteButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteScreen(node.id);
                  }}
                  title={labels.delete}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
