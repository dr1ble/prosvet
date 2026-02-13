"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  deleteSimulationLibraryItemRemote,
  fetchSimulationLibraryRemote,
  type SimulationLibraryFilter,
  type SimulationLibraryItemSummary,
} from "@/features/simulation/api/client";
import type { SimulationDraft } from "@/features/simulation/model/types";
import styles from "./LibraryTab.module.css";

type LibraryTabProps = {
  language: "ru" | "en";
  scopeKey: string;
  quickFilter: SimulationLibraryFilter | null;
  onSaveScenario: (
    mode: "all" | "selected",
  ) => Promise<{ ok: boolean; message?: string }>;
  onInsertScenario: (itemId: string) => Promise<boolean>;
};

type LibraryIconName =
  | "search"
  | "saveAll"
  | "saveSelected"
  | "library"
  | "add"
  | "version"
  | "screens"
  | "links"
  | "delete";

function LibraryIcon({ name }: { name: LibraryIconName }) {
  switch (name) {
    case "saveAll":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 4h11l3 3v13H5z" />
          <path d="M8 4v6h8V4" />
          <path d="M8 16h8" />
        </svg>
      );
    case "saveSelected":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="m9.5 12 1.8 1.8 3.4-3.6" />
        </svg>
      );
    case "library":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5h5v14H4z" />
          <path d="M10 5h5v14h-5z" />
          <path d="M16 5.8h4v13.2h-4z" />
        </svg>
      );
    case "add":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </svg>
      );
    case "version":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 6h14v12H5z" />
          <path d="M9 4v4" />
          <path d="M15 4v4" />
          <path d="M5 10h14" />
        </svg>
      );
    case "screens":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="12" rx="2" />
          <path d="M9 20h6" />
        </svg>
      );
    case "links":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8.5 14.5 6 17a3 3 0 1 0 4.2 4.2l2.5-2.5" />
          <path d="m15.5 9.5 2.5-2.5A3 3 0 0 0 13.8 2.8l-2.5 2.5" />
          <path d="m9 15 6-6" />
        </svg>
      );
    case "delete":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16" />
          <path d="M9 7V5h6v2" />
          <path d="M7 7l1 12h8l1-12" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6" />
          <path d="m20 20-4.2-4.2" />
        </svg>
      );
  }
}

function SearchField({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.searchField}>
      <span className={styles.searchFieldIcon} aria-hidden="true">
        <LibraryIcon name="search" />
      </span>
      <input
        className={styles.searchInput}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function formatVersion(item: SimulationLibraryItemSummary): string {
  if (!item.binding) {
    return "";
  }
  const range = `${item.binding.minSupportedVersion} - ${item.binding.maxSupportedVersion}`;
  if (!item.binding.releasedAt) {
    return range;
  }
  return `${range} • ${item.binding.releasedAt}`;
}

function isBindingMismatch(
  item: SimulationLibraryItemSummary,
  filter: SimulationLibraryFilter | null,
): boolean {
  if (!filter || !filter.appPackageName) {
    return false;
  }
  if (!item.binding) {
    return true;
  }
  if (item.binding.appPackageName !== filter.appPackageName) {
    return true;
  }
  if (
    filter.storeType &&
    item.binding.storeType &&
    filter.storeType !== item.binding.storeType
  ) {
    return true;
  }
  if (
    filter.minSupportedVersion &&
    item.binding.minSupportedVersion !== filter.minSupportedVersion
  ) {
    return true;
  }
  if (
    filter.maxSupportedVersion &&
    item.binding.maxSupportedVersion !== filter.maxSupportedVersion
  ) {
    return true;
  }
  if (
    filter.releasedAt &&
    (item.binding.releasedAt ?? "") !== filter.releasedAt
  ) {
    return true;
  }
  return false;
}

function getStoreBadgeGlyph(
  storeType: SimulationDraft["targetApp"]["storeType"],
): string {
  switch (storeType) {
    case "play_market":
      return "▶";
    case "rustore":
      return "R";
    case "app_store":
      return "A";
    default:
      return "•";
  }
}

function ScenarioCard({
  item,
  language,
  mismatch,
  loading,
  allowDelete,
  deleting,
  deleteTitle,
  onAdd,
  onDelete,
}: {
  item: SimulationLibraryItemSummary;
  language: "ru" | "en";
  mismatch: boolean;
  loading: boolean;
  allowDelete: boolean;
  deleting: boolean;
  deleteTitle: string;
  onAdd: (itemId: string) => void;
  onDelete: (itemId: string) => void;
}) {
  const titleFallback = language === "ru" ? "Без названия" : "Untitled";
  const appNameFallback =
    language === "ru" ? "Без привязки к приложению" : "No app binding";
  const version = formatVersion(item);
  const storeGlyph = getStoreBadgeGlyph(item.binding?.storeType ?? "other");

  return (
    <article
      className={styles.card}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(
          "application/x-simulation-library-item",
          JSON.stringify({ itemId: item.id }),
        );
      }}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardIdentity}>
          <span className={styles.cardAppIcon} aria-hidden="true">
            {item.binding?.iconUrl ? (
              <img src={item.binding.iconUrl} alt="" />
            ) : (
              <span className={styles.cardStoreBadge}>{storeGlyph}</span>
            )}
          </span>
          <div className={styles.cardIdentityText}>
            <strong className={styles.cardTitle}>
              {item.title || titleFallback}
            </strong>
            <span className={styles.cardAppName}>
              {item.targetAppName || appNameFallback}
            </span>
          </div>
        </div>
        <div className={styles.cardHeaderActions}>
          {mismatch ? (
            <span className={styles.warningTag}>
              {language === "ru" ? "Другая версия" : "Different version"}
            </span>
          ) : null}
          {allowDelete ? (
            <button
              type="button"
              className={styles.deleteCardButton}
              title={deleteTitle}
              aria-label={deleteTitle}
              draggable={false}
              disabled={deleting}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
                onDelete(item.id);
              }}
            >
              <span className={styles.inlineIcon} aria-hidden="true">
                <LibraryIcon name="delete" />
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {version ? (
        <p className={styles.cardVersion}>
          <span className={styles.metaWithIcon}>
            <span className={styles.inlineIcon} aria-hidden="true">
              <LibraryIcon name="version" />
            </span>
            <span>{version}</span>
          </span>
        </p>
      ) : null}
      <p className={styles.cardMeta}>
        <span className={styles.metaWithIcon}>
          <span className={styles.inlineIcon} aria-hidden="true">
            <LibraryIcon name="screens" />
          </span>
          <span>
            {language === "ru" ? "Экраны" : "Screens"}: {item.screensCount}
          </span>
        </span>
        <span className={styles.metaDot}>•</span>
        <span className={styles.metaWithIcon}>
          <span className={styles.inlineIcon} aria-hidden="true">
            <LibraryIcon name="links" />
          </span>
          <span>
            {language === "ru" ? "Связи" : "Links"}: {item.linksCount}
          </span>
        </span>
      </p>

      <button
        type="button"
        className={styles.primaryButton}
        disabled={loading || deleting}
        onClick={() => onAdd(item.id)}
      >
        <span className={styles.iconLabel}>
          <span className={styles.inlineIcon} aria-hidden="true">
            <LibraryIcon name="add" />
          </span>
          <span>
            {loading
              ? language === "ru"
                ? "Добавляем..."
                : "Adding..."
              : language === "ru"
                ? "Добавить на холст"
                : "Add to canvas"}
          </span>
        </span>
      </button>
    </article>
  );
}

export function LibraryTab({
  language,
  scopeKey,
  quickFilter,
  onSaveScenario,
  onInsertScenario,
}: LibraryTabProps) {
  const [quickItems, setQuickItems] = useState<SimulationLibraryItemSummary[]>(
    [],
  );
  const [allItems, setAllItems] = useState<SimulationLibraryItemSummary[]>([]);
  const [quickLoading, setQuickLoading] = useState(true);
  const [allLoading, setAllLoading] = useState(false);
  const [isAllModalOpen, setIsAllModalOpen] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState("");
  const [allSearchQuery, setAllSearchQuery] = useState("");
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<"all" | "selected" | null>(null);

  const labels = useMemo(
    () =>
      language === "ru"
        ? {
            title: "Сценарии",
            quickSearch: "Поиск сценариев",
            allScenarios: "Все сценарии",
            saveAll: "Сохранить весь холст",
            saveSelected: "Сохранить выделенное",
            quickEmpty: "Нет сценариев для текущего приложения и версии.",
            allEmpty: "В библиотеке пока нет сценариев.",
            loading: "Загрузка...",
            close: "Закрыть",
            modalTitle: "Библиотека сценариев",
            delete: "Удалить сценарий",
            deleting: "Удаляем...",
            deleteConfirm:
              "Удалить сценарий из библиотеки? Это действие нельзя отменить.",
            deleted: "Сценарий удалён из библиотеки.",
            deleteError: "Не удалось удалить сценарий.",
          }
        : {
            title: "Scenarios",
            quickSearch: "Search scenarios",
            allScenarios: "All scenarios",
            saveAll: "Save full canvas",
            saveSelected: "Save selected",
            quickEmpty: "No scenarios for current app and version.",
            allEmpty: "Scenario library is empty.",
            loading: "Loading...",
            close: "Close",
            modalTitle: "Scenario library",
            delete: "Delete scenario",
            deleting: "Deleting...",
            deleteConfirm:
              "Delete this scenario from library? This action cannot be undone.",
            deleted: "Scenario deleted from library.",
            deleteError: "Failed to delete scenario.",
          },
    [language],
  );

  const loadQuickItems = useCallback(async () => {
    setQuickLoading(true);
    setErrorMessage(null);
    try {
      const items = await fetchSimulationLibraryRemote(
        scopeKey,
        quickSearchQuery,
        quickFilter ?? undefined,
      );
      setQuickItems(items);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : language === "ru"
            ? "Не удалось загрузить сценарии."
            : "Failed to load scenarios.",
      );
    } finally {
      setQuickLoading(false);
    }
  }, [language, quickFilter, quickSearchQuery, scopeKey]);

  const loadAllItems = useCallback(async () => {
    setAllLoading(true);
    setErrorMessage(null);
    try {
      const items = await fetchSimulationLibraryRemote(
        scopeKey,
        allSearchQuery,
      );
      setAllItems(items);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : language === "ru"
            ? "Не удалось загрузить библиотеку сценариев."
            : "Failed to load scenarios library.",
      );
    } finally {
      setAllLoading(false);
    }
  }, [allSearchQuery, language, scopeKey]);

  useEffect(() => {
    void loadQuickItems();
  }, [loadQuickItems]);

  useEffect(() => {
    if (!isAllModalOpen) {
      return;
    }
    void loadAllItems();
  }, [isAllModalOpen, loadAllItems]);

  const handleAddScenario = async (itemId: string) => {
    setLoadingItemId(itemId);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const inserted = await onInsertScenario(itemId);
      if (!inserted) {
        setErrorMessage(
          language === "ru"
            ? "Не удалось добавить сценарий."
            : "Failed to add scenario.",
        );
        return;
      }
      setStatusMessage(
        language === "ru"
          ? "Сценарий добавлен на холст."
          : "Scenario added to canvas.",
      );
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleSave = async (mode: "all" | "selected") => {
    setSaveMode(mode);
    setErrorMessage(null);
    setStatusMessage(null);
    const result = await onSaveScenario(mode);
    if (!result.ok) {
      setErrorMessage(
        result.message ||
          (language === "ru"
            ? "Не удалось сохранить сценарий."
            : "Failed to save scenario."),
      );
      setSaveMode(null);
      return;
    }
    setStatusMessage(
      language === "ru"
        ? "Сценарий сохранён в библиотеку."
        : "Scenario saved to library.",
    );
    await Promise.all([
      loadQuickItems(),
      isAllModalOpen ? loadAllItems() : Promise.resolve(),
    ]);
    setSaveMode(null);
  };

  const handleDeleteScenario = async (itemId: string) => {
    if (!window.confirm(labels.deleteConfirm)) {
      return;
    }
    setDeletingItemId(itemId);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await deleteSimulationLibraryItemRemote(itemId);
      setStatusMessage(labels.deleted);
      await Promise.all([
        loadQuickItems(),
        isAllModalOpen ? loadAllItems() : Promise.resolve(),
      ]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : labels.deleteError,
      );
    } finally {
      setDeletingItemId(null);
    }
  };

  const renderItems = (
    items: SimulationLibraryItemSummary[],
    options?: { allowDelete?: boolean },
  ) =>
    items.map((item) => (
      <ScenarioCard
        key={item.id}
        item={item}
        language={language}
        mismatch={isBindingMismatch(item, quickFilter)}
        loading={loadingItemId === item.id}
        allowDelete={Boolean(options?.allowDelete)}
        deleting={deletingItemId === item.id}
        deleteTitle={
          deletingItemId === item.id ? labels.deleting : labels.delete
        }
        onAdd={handleAddScenario}
        onDelete={handleDeleteScenario}
      />
    ));

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>{labels.title}</h4>

      <div className={styles.actionsRow}>
        <button
          type="button"
          className={`${styles.secondaryButton} ${styles.rowButton}`}
          disabled={saveMode !== null}
          onClick={() => void handleSave("all")}
        >
          <span className={styles.iconLabel}>
            <span className={styles.inlineIcon} aria-hidden="true">
              <LibraryIcon name="saveAll" />
            </span>
            <span>{saveMode === "all" ? labels.loading : labels.saveAll}</span>
          </span>
        </button>
        <button
          type="button"
          className={`${styles.secondaryButton} ${styles.rowButton}`}
          disabled={saveMode !== null}
          onClick={() => void handleSave("selected")}
        >
          <span className={styles.iconLabel}>
            <span className={styles.inlineIcon} aria-hidden="true">
              <LibraryIcon name="saveSelected" />
            </span>
            <span>
              {saveMode === "selected" ? labels.loading : labels.saveSelected}
            </span>
          </span>
        </button>
      </div>

      <div className={styles.actionsRow}>
        <SearchField
          value={quickSearchQuery}
          onChange={setQuickSearchQuery}
          placeholder={labels.quickSearch}
        />
      </div>

      <div className={styles.actionsRow}>
        <button
          type="button"
          className={`${styles.secondaryButton} ${styles.fullWidthButton}`}
          onClick={() => setIsAllModalOpen(true)}
        >
          <span className={styles.iconLabel}>
            <span className={styles.inlineIcon} aria-hidden="true">
              <LibraryIcon name="library" />
            </span>
            <span>{labels.allScenarios}</span>
          </span>
        </button>
      </div>

      {statusMessage ? <p className={styles.status}>{statusMessage}</p> : null}
      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

      {quickLoading ? (
        <p className={styles.empty}>{labels.loading}</p>
      ) : quickItems.length === 0 ? (
        <p className={styles.empty}>{labels.quickEmpty}</p>
      ) : (
        <div className={styles.cardList}>{renderItems(quickItems)}</div>
      )}

      {isAllModalOpen ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={() => setIsAllModalOpen(false)}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.modalHeader}>
              <h4>{labels.modalTitle}</h4>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setIsAllModalOpen(false)}
              >
                {labels.close}
              </button>
            </header>

            <SearchField
              value={allSearchQuery}
              onChange={setAllSearchQuery}
              placeholder={labels.quickSearch}
            />

            {allLoading ? (
              <p className={styles.empty}>{labels.loading}</p>
            ) : allItems.length === 0 ? (
              <p className={styles.empty}>{labels.allEmpty}</p>
            ) : (
              <div className={styles.cardList}>
                {renderItems(allItems, { allowDelete: true })}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
