"use client";

import { useMemo, useRef } from "react";
import type {
  SimulationDraft,
  SimulationStoreType,
} from "@/features/simulation/model/types";
import styles from "./AppMediaTab.module.css";

export type AppMediaAsset = {
  id: string;
  filename: string;
  url: string;
  uploadedAt: string;
};

export type AppMediaVersion = {
  key: string;
  storeType: SimulationStoreType;
  minSupportedVersion: string;
  maxSupportedVersion: string;
  releasedAt: string | null;
  assetsCount: number;
  expanded: boolean;
  screensLoading: boolean;
  screensError: string | null;
  screens: AppMediaAsset[];
};

export type AppMediaApplication = {
  key: string;
  appName: string;
  iconUrl: string | null;
  expanded: boolean;
  versions: AppMediaVersion[];
};

type AppMediaTabProps = {
  language: "ru" | "en";
  applications: AppMediaApplication[];
  appsLoading: boolean;
  appsError: string | null;
  appSearchQuery: string;
  onAppSearchQueryChange: (value: string) => void;
  onToggleApplication: (appKey: string) => void;
  onToggleVersion: (appKey: string, versionKey: string) => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (appKey: string) => void;
  onScreenAdd: (screen: AppMediaAsset) => void;
  onScreenDragStart: (
    event: React.DragEvent<HTMLElement>,
    screen: AppMediaAsset,
  ) => void;
  modalOpen: boolean;
  modalMode: "create" | "edit";
  onCloseModal: () => void;
  modalTargetApp: SimulationDraft["targetApp"];
  onModalTargetAppNameChange: (value: string) => void;
  onModalTargetAppChange: (
    patch: Partial<SimulationDraft["targetApp"]>,
  ) => void;
  onModalResolveStoreData: () => void;
  modalResolvingStoreData: boolean;
  modalMediaSearchQuery: string;
  onModalMediaSearchQueryChange: (value: string) => void;
  modalMediaAssets: AppMediaAsset[];
  modalMediaLoading: boolean;
  modalMediaUploading: boolean;
  modalMediaError: string | null;
  modalMediaHint: string | null;
  onModalUploadMedia: (file: File) => Promise<void>;
  onModalScreenAdd: (screen: AppMediaAsset) => void;
  onModalScreenDragStart: (
    event: React.DragEvent<HTMLElement>,
    screen: AppMediaAsset,
  ) => void;
};

function stripExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "");
}

function formatVersionLabel(
  version: AppMediaVersion,
  language: "ru" | "en",
): string {
  const range = `${version.minSupportedVersion} - ${version.maxSupportedVersion}`;
  if (!version.releasedAt) {
    return range;
  }
  return language === "ru"
    ? `${range} • релиз ${version.releasedAt}`
    : `${range} • released ${version.releasedAt}`;
}

export function AppMediaTab({
  language,
  applications,
  appsLoading,
  appsError,
  appSearchQuery,
  onAppSearchQueryChange,
  onToggleApplication,
  onToggleVersion,
  onOpenCreateModal,
  onOpenEditModal,
  onScreenAdd,
  onScreenDragStart,
  modalOpen,
  modalMode,
  onCloseModal,
  modalTargetApp,
  onModalTargetAppNameChange,
  onModalTargetAppChange,
  onModalResolveStoreData,
  modalResolvingStoreData,
  modalMediaSearchQuery,
  onModalMediaSearchQueryChange,
  modalMediaAssets,
  modalMediaLoading,
  modalMediaUploading,
  modalMediaError,
  modalMediaHint,
  onModalUploadMedia,
  onModalScreenAdd,
  onModalScreenDragStart,
}: AppMediaTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const labels = useMemo(
    () =>
      language === "ru"
        ? {
            title: "Приложения",
            createHint: "Добавить приложение",
            searchApps: "Поиск по названию приложения",
            loadingApps: "Загружаем приложения...",
            noApps: "Приложений пока нет. Добавьте первое.",
            versionsTitle: "Версии",
            screensLoading: "Загружаем экраны...",
            noScreens: "У этой версии нет экранов.",
            dragHint: "Перетащите экран на холст или нажмите «Добавить».",
            addScreen: "Добавить",
            editApp: "Редактировать приложение",
            modalTitleCreate: "Добавить приложение и экраны",
            modalTitleEdit: "Редактировать приложение и экраны",
            appName: "Название приложения",
            appNameHint: "Например, СберБанк Онлайн",
            storeType: "Магазин",
            minVersion: "Мин. версия",
            minVersionHint: "Например, 1.0.0",
            maxVersion: "Макс. версия",
            maxVersionHint: "Например, 99.99.99",
            releasedAt: "Дата релиза",
            releasedAtHint: "Если нужно, укажите дату релиза",
            storeUrl: "Ссылка на магазин",
            storeUrlHint: "Вставьте ссылку на приложение в магазине",
            resolveStore: "Получить данные",
            resolvingStore: "Получаем...",
            modalSearch: "Поиск по экранам",
            uploadMedia: "Загрузить изображение",
            uploadingMedia: "Загрузка...",
            modalLoading: "Загружаем экраны...",
            modalEmpty: "Пока нет экранов для этой версии приложения.",
            close: "Закрыть",
          }
        : {
            title: "Applications",
            createHint: "Add application",
            searchApps: "Search by app name",
            loadingApps: "Loading applications...",
            noApps: "No applications yet. Add first one.",
            versionsTitle: "Versions",
            screensLoading: "Loading screens...",
            noScreens: "No screens in this version.",
            dragHint: "Drag screen to canvas or click Add.",
            addScreen: "Add",
            editApp: "Edit application",
            modalTitleCreate: "Add application and screens",
            modalTitleEdit: "Edit application and screens",
            appName: "Application name",
            appNameHint: "For example, SberBank Online",
            storeType: "Store",
            minVersion: "Min version",
            minVersionHint: "For example, 1.0.0",
            maxVersion: "Max version",
            maxVersionHint: "For example, 99.99.99",
            releasedAt: "Release date",
            releasedAtHint: "Set release date if needed",
            storeUrl: "Store URL",
            storeUrlHint: "Paste application store URL",
            resolveStore: "Fetch data",
            resolvingStore: "Loading...",
            modalSearch: "Search screens",
            uploadMedia: "Upload image",
            uploadingMedia: "Uploading...",
            modalLoading: "Loading screens...",
            modalEmpty: "No screens for this app version yet.",
            close: "Close",
          },
    [language],
  );

  const storeTypeOptions: Array<{ value: SimulationStoreType; label: string }> =
    [
      { value: "play_market", label: "Google Play" },
      { value: "rustore", label: "RuStore" },
      { value: "app_store", label: "App Store" },
      { value: "other", label: language === "ru" ? "Другой" : "Other" },
    ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>{labels.title}</h4>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onOpenCreateModal}
          title={labels.createHint}
          aria-label={labels.createHint}
        >
          +
        </button>
      </div>

      <input
        value={appSearchQuery}
        onChange={(event) => onAppSearchQueryChange(event.target.value)}
        placeholder={labels.searchApps}
        className={styles.searchInput}
      />

      {appsError ? <p className={styles.error}>{appsError}</p> : null}

      {appsLoading ? (
        <p className={styles.empty}>{labels.loadingApps}</p>
      ) : applications.length === 0 ? (
        <p className={styles.empty}>{labels.noApps}</p>
      ) : (
        <div className={styles.appList}>
          {applications.map((app) => (
            <section key={app.key} className={styles.appCard}>
              <div className={styles.appHeaderWrap}>
                <button
                  type="button"
                  className={styles.appHeader}
                  onClick={() => onToggleApplication(app.key)}
                >
                  <div className={styles.appIdentity}>
                    <span className={styles.appIcon} aria-hidden="true">
                      {app.iconUrl ? (
                        <img src={app.iconUrl} alt="" />
                      ) : (
                        app.appName.trim().slice(0, 1).toUpperCase() || "•"
                      )}
                    </span>
                    <strong>{app.appName}</strong>
                  </div>
                  <span className={styles.chevron}>
                    {app.expanded ? "▴" : "▾"}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.editButton}
                  onClick={() => onOpenEditModal(app.key)}
                  title={labels.editApp}
                  aria-label={labels.editApp}
                >
                  ✎
                </button>
              </div>

              {app.expanded ? (
                <div className={styles.appBody}>
                  <p className={styles.subTitle}>{labels.versionsTitle}</p>
                  <ul className={styles.versionList}>
                    {app.versions.map((version) => (
                      <li key={version.key} className={styles.versionItem}>
                        <button
                          type="button"
                          className={styles.versionButton}
                          onClick={() => onToggleVersion(app.key, version.key)}
                        >
                          <span>{formatVersionLabel(version, language)}</span>
                          <span className={styles.versionMeta}>
                            {version.assetsCount} {version.expanded ? "▴" : "▾"}
                          </span>
                        </button>

                        {version.expanded ? (
                          <div className={styles.versionScreens}>
                            <p className={styles.dragHint}>{labels.dragHint}</p>
                            {version.screensError ? (
                              <p className={styles.error}>
                                {version.screensError}
                              </p>
                            ) : version.screensLoading ? (
                              <p className={styles.empty}>
                                {labels.screensLoading}
                              </p>
                            ) : version.screens.length === 0 ? (
                              <p className={styles.empty}>{labels.noScreens}</p>
                            ) : (
                              <ul className={styles.screenList}>
                                {version.screens.map((screen) => (
                                  <li
                                    key={screen.id}
                                    className={styles.screenItem}
                                    draggable
                                    onDragStart={(event) =>
                                      onScreenDragStart(event, screen)
                                    }
                                  >
                                    <div className={styles.screenThumb}>
                                      <img
                                        src={screen.url}
                                        alt={screen.filename}
                                      />
                                    </div>
                                    <div className={styles.screenMeta}>
                                      <p>{stripExtension(screen.filename)}</p>
                                      <button
                                        type="button"
                                        className={styles.secondaryButton}
                                        onClick={() => onScreenAdd(screen)}
                                      >
                                        {labels.addScreen}
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}

      {modalOpen ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={onCloseModal}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.modalHeader}>
              <h4>
                {modalMode === "create"
                  ? labels.modalTitleCreate
                  : labels.modalTitleEdit}
              </h4>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onCloseModal}
              >
                {labels.close}
              </button>
            </header>

            <div className={styles.modalGrid}>
              <label>
                <span>{labels.appName}</span>
                <input
                  value={modalTargetApp.appName}
                  onChange={(event) =>
                    onModalTargetAppNameChange(event.target.value)
                  }
                  placeholder={labels.appNameHint}
                />
              </label>
              <label>
                <span>{labels.storeType}</span>
                <select
                  value={modalTargetApp.storeType}
                  onChange={(event) =>
                    onModalTargetAppChange({
                      storeType: event.target.value as SimulationStoreType,
                    })
                  }
                >
                  {storeTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{labels.minVersion}</span>
                <input
                  value={modalTargetApp.minSupportedVersion}
                  onChange={(event) =>
                    onModalTargetAppChange({
                      minSupportedVersion: event.target.value,
                    })
                  }
                  placeholder={labels.minVersionHint}
                />
              </label>
              <label>
                <span>{labels.maxVersion}</span>
                <input
                  value={modalTargetApp.maxSupportedVersion}
                  onChange={(event) =>
                    onModalTargetAppChange({
                      maxSupportedVersion: event.target.value,
                    })
                  }
                  placeholder={labels.maxVersionHint}
                />
              </label>
              <label>
                <span>{labels.releasedAt}</span>
                <input
                  type="date"
                  value={modalTargetApp.releasedAt}
                  onChange={(event) =>
                    onModalTargetAppChange({ releasedAt: event.target.value })
                  }
                  placeholder={labels.releasedAtHint}
                />
              </label>
              <label className={styles.fieldWide}>
                <span>{labels.storeUrl}</span>
                <div className={styles.urlRow}>
                  <input
                    value={modalTargetApp.storeUrl}
                    onChange={(event) =>
                      onModalTargetAppChange({ storeUrl: event.target.value })
                    }
                    placeholder={labels.storeUrlHint}
                  />
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={onModalResolveStoreData}
                    disabled={
                      modalResolvingStoreData || !modalTargetApp.storeUrl.trim()
                    }
                  >
                    {modalResolvingStoreData
                      ? labels.resolvingStore
                      : labels.resolveStore}
                  </button>
                </div>
              </label>
            </div>

            <div className={styles.modalMediaToolbar}>
              <input
                value={modalMediaSearchQuery}
                onChange={(event) =>
                  onModalMediaSearchQueryChange(event.target.value)
                }
                placeholder={labels.modalSearch}
                disabled={Boolean(modalMediaHint)}
              />
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={Boolean(modalMediaHint) || modalMediaUploading}
              >
                {modalMediaUploading
                  ? labels.uploadingMedia
                  : labels.uploadMedia}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className={styles.hiddenInput}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }
                  await onModalUploadMedia(file);
                  event.currentTarget.value = "";
                }}
              />
            </div>

            {modalMediaHint ? (
              <p className={styles.notice}>{modalMediaHint}</p>
            ) : null}
            {modalMediaError ? (
              <p className={styles.error}>{modalMediaError}</p>
            ) : null}

            {modalMediaHint ? null : modalMediaLoading ? (
              <p className={styles.empty}>{labels.modalLoading}</p>
            ) : modalMediaAssets.length === 0 ? (
              <p className={styles.empty}>{labels.modalEmpty}</p>
            ) : (
              <ul className={styles.modalScreenList}>
                {modalMediaAssets.map((screen) => (
                  <li
                    key={screen.id}
                    className={styles.screenItem}
                    draggable
                    onDragStart={(event) =>
                      onModalScreenDragStart(event, screen)
                    }
                  >
                    <div className={styles.screenThumb}>
                      <img src={screen.url} alt={screen.filename} />
                    </div>
                    <div className={styles.screenMeta}>
                      <p>{stripExtension(screen.filename)}</p>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => onModalScreenAdd(screen)}
                      >
                        {labels.addScreen}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
