"use client";
import {
  type ChangeEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { buildCatalogHref } from "@/features/catalog/catalog-navigation";
import type { AppLanguage } from "@/shared/i18n/lang";
import { ActionButton } from "@/shared/ui/action-button";
import { ActionLink } from "@/shared/ui/action-link";
import { StepSwitcher } from "@/shared/ui/step-switcher";

import {
  deleteSimulationLibraryItemRemote,
  fetchCurrentSimulationDraftRemote,
  fetchSimulationLibraryRemote,
  fetchSimulationMediaAssetsRemote,
  loadSimulationLibraryItemRemote,
  resolveSimulationStoreAppRemote,
  saveCurrentSimulationDraftRemote,
  saveSimulationLibraryItemRemote,
  updateSimulationLibraryItemRemote,
  type SimulationLibraryItemSummary,
  type SimulationMediaBinding,
  type SimulationMediaAsset,
  uploadSimulationMediaAssetRemote,
} from "../api/client";
import {
  createSimulationDraftFromPreset,
  createInitialSimulationDraft,
  createSimulationHotspot,
  createSimulationScreen,
  type SimulationPresetId,
} from "../model/factories";
import { ensurePackageName, isValidPackageName } from "../model/app-id";
import { simulationDraftToReleaseScreens } from "../model/export";
import { validateSimulationDraft } from "../model/validation";
import {
  clearSimulationDraft,
  loadPreparedReleaseScreens,
  loadSimulationDraft,
  savePreparedReleaseScreens,
  saveSimulationDraft,
} from "../model/storage";
import type {
  SimulationDraft,
  SimulationHotspotDraft,
  SimulationStoreType,
} from "../model/types";
import styles from "./simulation-builder.module.css";

type SimulationBuilderProps = {
  language: AppLanguage;
  scopeKey: string;
  scopeLabel: string;
  courseId?: string | null;
};

type FlashState = {
  kind: "ok" | "error";
  message: string;
} | null;

type SyncState = {
  loading: boolean;
  saving: boolean;
  lastSavedAt: string | null;
  error: string | null;
};

type PreviewState = {
  active: boolean;
  currentScreenId: string | null;
  lastHint: string;
  path: string[];
};

type BuilderMode = "simple" | "advanced";
type SimpleStep = "screens" | "hotspots" | "export";
type CollapsibleSectionKey =
  | "targetApp"
  | "library"
  | "presets"
  | "media"
  | "graph"
  | "hotspotEditor"
  | "transitions"
  | "validation"
  | "preview"
  | "export";

function hasStoreChallengeMarker(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    normalized.includes("challenge") ||
    normalized.includes("hash429") ||
    normalized.includes("captcha") ||
    normalized.includes("access denied") ||
    normalized.includes("too many requests") ||
    /(?:^|[\s:;,.()\[\]{}_-])error\s*4\d\d(?:$|[\s:;,.()\[\]{}_-])/i.test(
      normalized,
    ) ||
    normalized.includes("ошибка 429") ||
    /ошибка\s*4\d\d/i.test(normalized)
  );
}

function sanitizeTargetAppDraft(
  targetApp: SimulationDraft["targetApp"],
): SimulationDraft["targetApp"] {
  const appNameLooksBroken = hasStoreChallengeMarker(targetApp.appName);
  const urlLooksBroken = hasStoreChallengeMarker(targetApp.storeUrl);
  if (!appNameLooksBroken && !urlLooksBroken) {
    return targetApp;
  }

  return {
    ...targetApp,
    appName: appNameLooksBroken ? "" : targetApp.appName,
    iconUrl: appNameLooksBroken || urlLooksBroken ? "" : targetApp.iconUrl,
    storeUrl: urlLooksBroken ? "" : targetApp.storeUrl,
  };
}

function sanitizeDraft(draft: SimulationDraft): SimulationDraft {
  return {
    ...draft,
    targetApp: sanitizeTargetAppDraft(draft.targetApp),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function formatSavedAt(value: string, language: AppLanguage): string {
  const locale = language === "ru" ? "ru-RU" : "en-US";
  return new Date(value).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDateTime(value: string, language: AppLanguage): string {
  const locale = language === "ru" ? "ru-RU" : "en-US";
  return new Date(value).toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMediaDisplayName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Экран";
  }
  return trimmed.replace(/\.[^.]+$/, "") || trimmed;
}

function normalizePathSegment(value: string): string {
  return decodeURIComponent(value).trim();
}

function detectStoreTypeFromUrl(value: string): SimulationStoreType | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsedUrl.hostname.toLowerCase();
  if (host.includes("play.google.com")) {
    return "play_market";
  }
  if (host.includes("rustore.ru")) {
    return "rustore";
  }
  if (host.includes("apps.apple.com") || host.includes("itunes.apple.com")) {
    return "app_store";
  }
  return null;
}

function parseSemver(value: string): [number, number, number] | null {
  const match = value.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareSemver(
  left: [number, number, number],
  right: [number, number, number],
): number {
  if (left[0] !== right[0]) {
    return left[0] - right[0];
  }
  if (left[1] !== right[1]) {
    return left[1] - right[1];
  }
  return left[2] - right[2];
}

function isValidReleaseDate(value: string): boolean {
  if (!value.trim()) {
    return true;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return false;
  }
  const date = new Date(`${value.trim()}T00:00:00Z`);
  return !Number.isNaN(date.getTime());
}

function getUniqueScreenKey(
  baseKey: string,
  existingKeys: Set<string>,
  fallbackIndex: number,
): string {
  const normalizedBase = baseKey.trim() || `screen_${fallbackIndex}`;
  if (!existingKeys.has(normalizedBase)) {
    return normalizedBase;
  }

  let index = 1;
  let candidate = `${normalizedBase}_copy`;
  while (existingKeys.has(candidate)) {
    index += 1;
    candidate = `${normalizedBase}_copy_${index}`;
  }
  return candidate;
}

export function SimulationBuilder({
  language,
  scopeKey,
  scopeLabel,
  courseId,
}: SimulationBuilderProps) {
  const labels =
    language === "ru"
      ? {
          title: "Конструктор симуляций",
          subtitle: "Соберите сценарий урока за 3 шага: экраны, зоны, экспорт.",
          scopeTitle: "Контекст черновика",
          modeSimple: "Простой режим",
          modeAdvanced: "Расширенный",
          stepScreens: "1. Экраны",
          stepHotspots: "2. Зоны и переходы",
          stepExport: "3. Экспорт",
          simpleHintScreens:
            "Сначала задайте понятные названия экранов и отметьте стартовый экран.",
          simpleHintHotspotsReady:
            "Добавьте кликабельные зоны и переходы между экранами.",
          simpleHintHotspotsEmpty:
            "Добавьте хотя бы одну кликабельную зону, чтобы перейти к экспорту.",
          simpleHintExportReady:
            "Проверьте статус и подготовьте JSON для вставки в каталог.",
          simpleHintExportBlocked:
            "Исправьте ошибки валидации перед экспортом.",
          simpleBack: "Назад",
          simpleNextHotspots: "К шагу 2",
          simpleNextExport: "К шагу 3",
          scenarioTitle: "Название сценария",
          scenarioPlaceholder: "Например: Оплата ЖКХ в приложении банка",
          targetAppTitle: "Приложение и релиз",
          targetAppHint:
            "Укажите название и диапазон версий. По ссылке из магазина можно автоматически подтянуть официальное название и иконку.",
          targetAppName: "Название приложения",
          targetAppNamePlaceholder: "СберБанк Онлайн",
          targetAppStoreType: "Магазин",
          targetAppStorePlayMarket: "Google Play",
          targetAppStoreRuStore: "RuStore",
          targetAppStoreAppStore: "App Store",
          targetAppStoreOther: "Другой",
          targetAppStoreUrl: "URL в магазине (опционально)",
          targetAppStoreUrlHint:
            "Вставьте ссылку из Google Play, RuStore или App Store. Название и иконка подтянутся с самой страницы магазина.",
          targetAppExtractFromStore: "Получить данные из ссылки",
          targetAppResolveLoading: "Получаем данные...",
          targetAppExtractFromStoreSuccess:
            "Название и иконка приложения обновлены по странице магазина.",
          targetAppExtractFromStoreError:
            "Не удалось получить данные со страницы магазина. Проверьте ссылку.",
          targetAppChallengeUrlError:
            "Ссылка ведет на страницу проверки (challenge/429). Откройте карточку приложения в магазине и вставьте прямую ссылку на нее.",
          targetAppIconAlt: "Иконка приложения",
          targetAppMinVersion: "Мин. поддерживаемая версия",
          targetAppMaxVersion: "Макс. поддерживаемая версия",
          targetAppReleasedAt: "Дата релиза (опционально)",
          sectionExpand: "Развернуть",
          sectionCollapse: "Свернуть",
          libraryTitle: "Библиотека симуляций",
          libraryHint:
            "Сохраняйте удачные сценарии и загружайте их повторно для новых курсов.",
          librarySearchPlaceholder: "Поиск сценариев",
          librarySaveAsNew: "Сохранить как новый",
          libraryUpdateSelected: "Обновить выбранный",
          librarySaving: "Сохранение...",
          libraryUpdating: "Обновление...",
          libraryLoading: "Загружаем библиотеку...",
          libraryEmpty: "В библиотеке пока нет симуляций.",
          libraryLoad: "Загрузить",
          libraryDelete: "Удалить",
          librarySelectedTag: "Выбран для обновления",
          libraryUpdatedAt: "Обновлено",
          libraryTargetAppFallback: "Без привязки к приложению",
          librarySaved: "Сценарий сохранен в библиотеку.",
          libraryUpdated: "Выбранный сценарий обновлен.",
          libraryLoaded: "Сценарий загружен из библиотеки.",
          libraryDeleted: "Сценарий удален из библиотеки.",
          librarySaveError: "Не удалось сохранить в библиотеку.",
          libraryUpdateError: "Не удалось обновить выбранный сценарий.",
          libraryLoadError: "Не удалось загрузить из библиотеки.",
          libraryDeleteError: "Не удалось удалить из библиотеки.",
          libraryListError: "Не удалось получить список библиотеки.",
          mediaLibraryTitle: "Медиатека экранов",
          mediaSearchPlaceholder: "Поиск по названию изображения",
          mediaUploadLabel: "Загрузить изображение",
          mediaUploading: "Загрузка...",
          mediaLoading: "Загружаем медиатеку...",
          mediaEmpty: "Пока нет изображений. Загрузите первое.",
          mediaBindingInvalid:
            "Укажите название приложения и диапазон версий X.Y.Z, чтобы работать с медиатекой.",
          mediaBindingDateInvalid:
            "Дата релиза должна быть в формате YYYY-MM-DD.",
          mediaChoose: "Выбрать",
          mediaUploadError: "Не удалось загрузить изображение.",
          mediaListError: "Не удалось получить список изображений.",
          mediaUploadedAndSelected:
            "Изображение загружено и выбрано для экрана.",
          presetsTitle: "Быстрый старт",
          presetsHint:
            "Выберите шаблон, чтобы получить готовую структуру сценария.",
          presetApply: "Использовать",
          presetApplied: "Шаблон применен.",
          presetBlankTitle: "Пустой сценарий",
          presetBlankDescription:
            "Старт с одного экрана, если хотите собрать логику вручную.",
          presetBankTitle: "Банковский платеж",
          presetBankDescription:
            "Путь: главный экран -> форма оплаты -> успешное завершение.",
          presetGovTitle: "Госуслуга",
          presetGovDescription:
            "Путь: каталог услуг -> форма заявления -> подтверждение.",
          presetMessengerTitle: "Сообщение в мессенджере",
          presetMessengerDescription:
            "Путь: список чатов -> диалог -> отправка сообщения.",
          screens: "Экраны",
          addScreen: "Добавить экран",
          removeScreen: "Удалить",
          duplicateScreen: "Дублировать",
          moveScreenUp: "Выше",
          moveScreenDown: "Ниже",
          startScreen: "Стартовый",
          noScreen: "Выберите экран слева или добавьте новый.",
          screenKey: "Ключ экрана",
          screenTitle: "Название экрана",
          screenImageUrl: "URL изображения экрана",
          screenCompletion: "Финал",
          screenMarkCompletion: "Сделать финальным",
          screenUnmarkCompletion: "Снять финал",
          canvasHint:
            "Клик по области предпросмотра добавляет зону. Размер и переход настраиваются справа.",
          screenPreviewHint:
            "Подготовьте экран: название, изображение, финальный статус.",
          hotspotListTitle: "Зоны выбранного экрана",
          noHotspots: "Зон пока нет.",
          selectHotspot: "Выбрать",
          hotspotEditorTitle: "Настройки зоны",
          hotspotLabel: "Подпись зоны",
          hotspotHint: "Подсказка",
          hotspotX: "X (%)",
          hotspotY: "Y (%)",
          hotspotWidth: "Ширина (%)",
          hotspotHeight: "Высота (%)",
          hotspotTarget: "Переход к экрану",
          hotspotTargetNone: "Без перехода",
          removeHotspot: "Удалить зону",
          duplicateHotspot: "Дублировать зону",
          graphTitle: "Граф переходов",
          graphHint:
            "Ноды — экраны. Линии показывают, куда ведут кликабельные зоны.",
          transitionsTitle: "Переходы сценария",
          noTransitions: "Переходы пока не настроены.",
          validationTitle: "Валидация сценария",
          validationHint:
            "Перед экспортом проверьте ошибки маршрутов, недостижимые экраны и параметры зон.",
          validationNoIssues: "Ошибок не найдено. Сценарий готов к экспорту.",
          validationErrorsSummary: (count: number) =>
            `Ошибки: ${count}. Исправьте перед экспортом.`,
          validationWarningsSummary: (count: number) =>
            `Предупреждения: ${count}. Рекомендуется проверить.`,
          validationJumpTo: "Перейти",
          prepareBlocked: (count: number) =>
            `Экспорт заблокирован: ${count} ошибок валидации.`,
          validationCompactOk: "Проверка пройдена.",
          validationCompactIssues: (errors: number, warnings: number) =>
            `Ошибки: ${errors}, предупреждения: ${warnings}.`,
          duplicateSuffix: "копия",
          prepareJson: "Подготовить JSON для каталога",
          copyJson: "Скопировать JSON",
          resetDraft: "Сбросить черновик",
          openCatalog: "Открыть каталог (режим конструктора)",
          preparedOk: "JSON подготовлен и сохранен для вставки в каталог.",
          copiedOk: "JSON скопирован в буфер обмена.",
          copyError: "Не удалось скопировать JSON.",
          jsonLabel: "Готовый JSON экранов для релиза",
          canvasEmpty: "Добавьте URL изображения для визуального контекста",
          previewTitle: "Превью прохождения",
          previewStart: "Запустить превью",
          previewStop: "Остановить",
          previewResetPath: "С начала",
          previewHintFallback: "Подсказка для этого действия не задана.",
          previewNoTarget: "Для этой зоны переход не задан.",
          previewPathTitle: "Путь пользователя",
          previewInactive:
            "Запустите превью, чтобы пройти сценарий как пользователь.",
          syncLoading: "Загрузка черновика...",
          syncSaving: "Сохранение...",
          syncSavedAt: "Сохранено",
          syncError: "Ошибка синхронизации",
          remoteLoadError: "Не удалось загрузить серверный черновик.",
        }
      : {
          title: "Simulation Builder",
          subtitle:
            "Build a lesson scenario in 3 steps: screens, hotspots, export.",
          scopeTitle: "Draft scope",
          modeSimple: "Simple mode",
          modeAdvanced: "Advanced",
          stepScreens: "1. Screens",
          stepHotspots: "2. Hotspots and transitions",
          stepExport: "3. Export",
          simpleHintScreens:
            "Start with clear screen titles and set the start screen.",
          simpleHintHotspotsReady:
            "Add clickable hotspots and transitions between screens.",
          simpleHintHotspotsEmpty:
            "Add at least one hotspot to continue to export.",
          simpleHintExportReady:
            "Review validation status and prepare JSON for catalog import.",
          simpleHintExportBlocked: "Resolve validation errors before export.",
          simpleBack: "Back",
          simpleNextHotspots: "Go to step 2",
          simpleNextExport: "Go to step 3",
          scenarioTitle: "Scenario title",
          scenarioPlaceholder: "Example: Utility payment in a banking app",
          targetAppTitle: "App and release",
          targetAppHint:
            "Set app name and version range. Use a store link to auto-load the official title and icon from the store page.",
          targetAppName: "Application name",
          targetAppNamePlaceholder: "SberBank Online",
          targetAppStoreType: "Store",
          targetAppStorePlayMarket: "Google Play",
          targetAppStoreRuStore: "RuStore",
          targetAppStoreAppStore: "App Store",
          targetAppStoreOther: "Other",
          targetAppStoreUrl: "Store URL (optional)",
          targetAppStoreUrlHint:
            "Paste a Google Play, RuStore, or App Store URL. App title and icon will be loaded from the store page.",
          targetAppExtractFromStore: "Fetch from URL",
          targetAppResolveLoading: "Loading store data...",
          targetAppExtractFromStoreSuccess:
            "Application title and icon were updated from the store page.",
          targetAppExtractFromStoreError:
            "Unable to load app details from the store page. Check the URL.",
          targetAppChallengeUrlError:
            "The URL points to a challenge/429 page. Open the app card in the store and paste that direct URL.",
          targetAppIconAlt: "Application icon",
          targetAppMinVersion: "Min supported version",
          targetAppMaxVersion: "Max supported version",
          targetAppReleasedAt: "Release date (optional)",
          sectionExpand: "Expand",
          sectionCollapse: "Collapse",
          libraryTitle: "Simulation library",
          libraryHint:
            "Save good scenarios and quickly reuse them for new courses.",
          librarySearchPlaceholder: "Search simulations",
          librarySaveAsNew: "Save as new",
          libraryUpdateSelected: "Update selected",
          librarySaving: "Saving...",
          libraryUpdating: "Updating...",
          libraryLoading: "Loading library...",
          libraryEmpty: "Library is empty for now.",
          libraryLoad: "Load",
          libraryDelete: "Delete",
          librarySelectedTag: "Selected for update",
          libraryUpdatedAt: "Updated",
          libraryTargetAppFallback: "No target app",
          librarySaved: "Scenario saved to library.",
          libraryUpdated: "Selected scenario updated.",
          libraryLoaded: "Scenario loaded from library.",
          libraryDeleted: "Scenario deleted from library.",
          librarySaveError: "Unable to save to library.",
          libraryUpdateError: "Unable to update selected scenario.",
          libraryLoadError: "Unable to load from library.",
          libraryDeleteError: "Unable to delete from library.",
          libraryListError: "Unable to load simulation library.",
          mediaLibraryTitle: "Screen media library",
          mediaSearchPlaceholder: "Search by image filename",
          mediaUploadLabel: "Upload image",
          mediaUploading: "Uploading...",
          mediaLoading: "Loading media library...",
          mediaEmpty: "No images yet. Upload your first one.",
          mediaBindingInvalid:
            "Provide app name and version range in X.Y.Z format to use the media library.",
          mediaBindingDateInvalid: "Release date must use YYYY-MM-DD format.",
          mediaChoose: "Choose",
          mediaUploadError: "Unable to upload image.",
          mediaListError: "Unable to fetch media library.",
          mediaUploadedAndSelected:
            "Image uploaded and selected for the current screen.",
          presetsTitle: "Quick start",
          presetsHint:
            "Choose a template to get a ready-to-edit scenario structure.",
          presetApply: "Use template",
          presetApplied: "Template applied.",
          presetBlankTitle: "Blank scenario",
          presetBlankDescription:
            "Start with one screen if you want to build the flow manually.",
          presetBankTitle: "Bank payment",
          presetBankDescription:
            "Flow: home screen -> payment form -> successful completion.",
          presetGovTitle: "Government service",
          presetGovDescription:
            "Flow: service catalog -> request form -> confirmation.",
          presetMessengerTitle: "Messenger message",
          presetMessengerDescription:
            "Flow: chats list -> conversation -> message sent.",
          screens: "Screens",
          addScreen: "Add screen",
          removeScreen: "Remove",
          duplicateScreen: "Duplicate",
          moveScreenUp: "Up",
          moveScreenDown: "Down",
          startScreen: "Start",
          noScreen: "Select a screen on the left or create a new one.",
          screenKey: "Screen key",
          screenTitle: "Screen title",
          screenImageUrl: "Screen image URL",
          screenCompletion: "Final",
          screenMarkCompletion: "Mark final",
          screenUnmarkCompletion: "Unset final",
          canvasHint:
            "Click on preview area to add a hotspot. Tune its size and transition in the right panel.",
          screenPreviewHint:
            "Prepare the screen: title, image, and completion flag.",
          hotspotListTitle: "Hotspots on selected screen",
          noHotspots: "No hotspots yet.",
          selectHotspot: "Select",
          hotspotEditorTitle: "Hotspot settings",
          hotspotLabel: "Hotspot label",
          hotspotHint: "Hint",
          hotspotX: "X (%)",
          hotspotY: "Y (%)",
          hotspotWidth: "Width (%)",
          hotspotHeight: "Height (%)",
          hotspotTarget: "Target screen",
          hotspotTargetNone: "No transition",
          removeHotspot: "Remove hotspot",
          duplicateHotspot: "Duplicate hotspot",
          graphTitle: "Transition graph",
          graphHint: "Nodes are screens. Edges show where each hotspot leads.",
          transitionsTitle: "Scenario transitions",
          noTransitions: "No transitions configured yet.",
          validationTitle: "Scenario validation",
          validationHint:
            "Validate route errors, unreachable screens, and hotspot geometry before export.",
          validationNoIssues:
            "No blocking issues found. Scenario is ready to export.",
          validationErrorsSummary: (count: number) =>
            `Errors: ${count}. Fix them before export.`,
          validationWarningsSummary: (count: number) =>
            `Warnings: ${count}. Recommended to review.`,
          validationJumpTo: "Jump",
          prepareBlocked: (count: number) =>
            `Export blocked: ${count} validation errors.`,
          validationCompactOk: "Validation passed.",
          validationCompactIssues: (errors: number, warnings: number) =>
            `Errors: ${errors}, warnings: ${warnings}.`,
          duplicateSuffix: "copy",
          prepareJson: "Prepare JSON for catalog",
          copyJson: "Copy JSON",
          resetDraft: "Reset draft",
          openCatalog: "Open catalog (builder mode)",
          preparedOk: "JSON prepared and stored for catalog import.",
          copiedOk: "JSON copied to clipboard.",
          copyError: "Unable to copy JSON.",
          jsonLabel: "Release-ready screens JSON",
          canvasEmpty: "Add an image URL to get visual context",
          previewTitle: "Flow preview",
          previewStart: "Start preview",
          previewStop: "Stop",
          previewResetPath: "Restart",
          previewHintFallback: "No hint configured for this action.",
          previewNoTarget: "This hotspot has no transition target.",
          previewPathTitle: "Learner path",
          previewInactive: "Start preview to walk through the scenario.",
          syncLoading: "Loading draft...",
          syncSaving: "Saving...",
          syncSavedAt: "Saved",
          syncError: "Sync error",
          remoteLoadError: "Unable to load server draft.",
        };

  const [draft, setDraft] = useState<SimulationDraft>(() =>
    createInitialSimulationDraft(),
  );
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(
    null,
  );
  const [preparedJson, setPreparedJson] = useState("[]");
  const [flash, setFlash] = useState<FlashState>(null);
  const [hydrated, setHydrated] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>({
    loading: true,
    saving: false,
    lastSavedAt: null,
    error: null,
  });
  const [previewState, setPreviewState] = useState<PreviewState>({
    active: false,
    currentScreenId: null,
    lastHint: "",
    path: [],
  });
  const [builderMode, setBuilderMode] = useState<BuilderMode>("simple");
  const [simpleStep, setSimpleStep] = useState<SimpleStep>("screens");
  const [mediaAssets, setMediaAssets] = useState<SimulationMediaAsset[]>([]);
  const [mediaSearchQuery, setMediaSearchQuery] = useState("");
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [libraryItems, setLibraryItems] = useState<
    SimulationLibraryItemSummary[]
  >([]);
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySaving, setLibrarySaving] = useState(false);
  const [libraryUpdating, setLibraryUpdating] = useState(false);
  const [selectedLibraryItemId, setSelectedLibraryItemId] = useState<
    string | null
  >(null);
  const [libraryActionItemId, setLibraryActionItemId] = useState<string | null>(
    null,
  );
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [resolvingStoreApp, setResolvingStoreApp] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaInputKey, setMediaInputKey] = useState(0);
  const [expandedSections, setExpandedSections] = useState<
    Record<CollapsibleSectionKey, boolean>
  >({
    targetApp: true,
    library: true,
    presets: false,
    media: true,
    graph: false,
    hotspotEditor: true,
    transitions: false,
    validation: false,
    preview: false,
    export: true,
  });

  const mediaBinding = useMemo<SimulationMediaBinding>(
    () => ({
      appPackageName: ensurePackageName(
        draft.targetApp.packageName,
        draft.targetApp.appName,
      ),
      storeType: draft.targetApp.storeType,
      minSupportedVersion: draft.targetApp.minSupportedVersion.trim(),
      maxSupportedVersion: draft.targetApp.maxSupportedVersion.trim(),
      releasedAt: draft.targetApp.releasedAt.trim(),
    }),
    [draft.targetApp],
  );

  const mediaBindingError = useMemo(() => {
    if (!draft.targetApp.appName.trim()) {
      return labels.mediaBindingInvalid;
    }
    if (!isValidPackageName(mediaBinding.appPackageName)) {
      return labels.mediaBindingInvalid;
    }
    const minSemver = parseSemver(mediaBinding.minSupportedVersion);
    const maxSemver = parseSemver(mediaBinding.maxSupportedVersion);
    if (!minSemver || !maxSemver || compareSemver(minSemver, maxSemver) > 0) {
      return labels.mediaBindingInvalid;
    }
    if (!isValidReleaseDate(mediaBinding.releasedAt)) {
      return labels.mediaBindingDateInvalid;
    }
    return null;
  }, [
    draft.targetApp.appName,
    labels.mediaBindingDateInvalid,
    labels.mediaBindingInvalid,
    mediaBinding.appPackageName,
    mediaBinding.maxSupportedVersion,
    mediaBinding.minSupportedVersion,
    mediaBinding.releasedAt,
  ]);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    setSyncState({
      loading: true,
      saving: false,
      lastSavedAt: null,
      error: null,
    });

    const localDraft = loadSimulationDraft(scopeKey);
    const sanitizedLocalDraft = sanitizeDraft(localDraft);
    const prepared = loadPreparedReleaseScreens(scopeKey);

    setDraft(sanitizedLocalDraft);
    setSelectedScreenId(
      sanitizedLocalDraft.startScreenId ??
        sanitizedLocalDraft.screens[0]?.id ??
        null,
    );
    setSelectedHotspotId(null);
    if (prepared && prepared.length > 0) {
      setPreparedJson(JSON.stringify(prepared, null, 2));
    } else {
      setPreparedJson("[]");
    }

    const hydrate = async () => {
      try {
        const remoteDraft = await fetchCurrentSimulationDraftRemote(scopeKey);
        if (cancelled) {
          return;
        }

        if (remoteDraft) {
          const sanitizedRemoteDraft = sanitizeDraft(remoteDraft);
          setDraft(sanitizedRemoteDraft);
          setSelectedScreenId(
            sanitizedRemoteDraft.startScreenId ??
              sanitizedRemoteDraft.screens[0]?.id ??
              null,
          );
          setSelectedHotspotId(null);
        }
      } catch {
        if (!cancelled) {
          setSyncState((prev) => ({
            ...prev,
            error: labels.remoteLoadError,
          }));
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
          setSyncState((prev) => ({
            ...prev,
            loading: false,
          }));
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [labels.remoteLoadError, scopeKey]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    saveSimulationDraft(draft, scopeKey);
  }, [draft, hydrated, scopeKey]);

  useEffect(() => {
    if (!hydrated || syncState.loading) {
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        setSyncState((prev) => ({
          ...prev,
          saving: true,
          error: null,
        }));

        await saveCurrentSimulationDraftRemote(draft, scopeKey);
        if (cancelled) {
          return;
        }

        setSyncState((prev) => ({
          ...prev,
          saving: false,
          lastSavedAt: nowIso(),
          error: null,
        }));
      } catch {
        if (!cancelled) {
          setSyncState((prev) => ({
            ...prev,
            saving: false,
            error: labels.syncError,
          }));
        }
      }
    }, 900);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [draft, hydrated, labels.syncError, scopeKey, syncState.loading]);

  useEffect(() => {
    if (mediaBindingError) {
      setMediaLoading(false);
      setMediaError(null);
      setMediaAssets([]);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setMediaLoading(true);
      setMediaError(null);
      try {
        const nextAssets = await fetchSimulationMediaAssetsRemote(
          scopeKey,
          mediaSearchQuery,
          mediaBinding,
        );
        if (!cancelled) {
          setMediaAssets(nextAssets);
        }
      } catch (error) {
        if (!cancelled) {
          setMediaError(parseErrorMessage(error, labels.mediaListError));
        }
      } finally {
        if (!cancelled) {
          setMediaLoading(false);
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [
    labels.mediaListError,
    mediaBinding,
    mediaBindingError,
    mediaSearchQuery,
    scopeKey,
  ]);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setLibraryLoading(true);
      setLibraryError(null);
      try {
        const nextItems = await fetchSimulationLibraryRemote(
          scopeKey,
          librarySearchQuery,
        );
        if (!cancelled) {
          setLibraryItems(nextItems);
        }
      } catch (error) {
        if (!cancelled) {
          setLibraryError(parseErrorMessage(error, labels.libraryListError));
        }
      } finally {
        if (!cancelled) {
          setLibraryLoading(false);
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [labels.libraryListError, librarySearchQuery, scopeKey]);

  useEffect(() => {
    if (!selectedLibraryItemId) {
      return;
    }
    if (!libraryItems.some((item) => item.id === selectedLibraryItemId)) {
      setSelectedLibraryItemId(null);
    }
  }, [libraryItems, selectedLibraryItemId]);

  const screens = draft.screens;
  const screenById = useMemo(
    () => new Map(screens.map((screen) => [screen.id, screen])),
    [screens],
  );

  const selectedScreen =
    screens.find((screen) => screen.id === selectedScreenId) ??
    screens[0] ??
    null;
  const selectedHotspot =
    selectedScreen?.hotspots.find(
      (hotspot) => hotspot.id === selectedHotspotId,
    ) ?? null;

  const previewScreen =
    (previewState.currentScreenId
      ? screenById.get(previewState.currentScreenId)
      : null) ?? null;

  useEffect(() => {
    if (!selectedScreen && screens.length > 0) {
      setSelectedScreenId(screens[0].id);
      return;
    }
    if (
      selectedScreenId &&
      !screens.some((screen) => screen.id === selectedScreenId)
    ) {
      setSelectedScreenId(screens[0]?.id ?? null);
    }
  }, [screens, selectedScreen, selectedScreenId]);

  useEffect(() => {
    if (
      selectedHotspotId &&
      !selectedScreen?.hotspots.some(
        (hotspot) => hotspot.id === selectedHotspotId,
      )
    ) {
      setSelectedHotspotId(null);
    }
  }, [selectedScreen, selectedHotspotId]);

  useEffect(() => {
    if (!previewState.active) {
      return;
    }

    const current = previewState.currentScreenId;
    if (!current || !screenById.has(current)) {
      setPreviewState((prev) => ({
        ...prev,
        currentScreenId: draft.startScreenId ?? screens[0]?.id ?? null,
      }));
    }
  }, [
    draft.startScreenId,
    previewState.active,
    previewState.currentScreenId,
    screenById,
    screens,
  ]);

  const transitions = useMemo(() => {
    return screens.flatMap((screen) =>
      screen.hotspots
        .filter((hotspot) => hotspot.targetScreenId)
        .map((hotspot) => ({
          fromScreenTitle: screen.title,
          fromHotspotLabel: hotspot.label,
          toScreenTitle:
            screenById.get(hotspot.targetScreenId ?? "")?.title ?? "—",
        })),
    );
  }, [screenById, screens]);

  const graph = useMemo(() => {
    const columns = Math.min(
      3,
      Math.max(1, Math.ceil(Math.sqrt(screens.length))),
    );
    const rows = Math.max(1, Math.ceil(screens.length / columns));

    const width = columns * 260;
    const height = rows * 170;

    const nodes = screens.map((screen, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = 130 + col * 250;
      const y = 70 + row * 150;
      return {
        id: screen.id,
        title: screen.title,
        isCompletion: screen.isCompletion,
        x,
        y,
      };
    });

    const nodeById = new Map(nodes.map((node) => [node.id, node]));

    const edges = screens.flatMap((screen) =>
      screen.hotspots.flatMap((hotspot) => {
        if (!hotspot.targetScreenId) {
          return [];
        }
        const fromNode = nodeById.get(screen.id);
        const toNode = nodeById.get(hotspot.targetScreenId);
        if (!fromNode || !toNode) {
          return [];
        }
        return [
          {
            key: `${screen.id}-${hotspot.id}-${hotspot.targetScreenId}`,
            x1: fromNode.x,
            y1: fromNode.y,
            x2: toNode.x,
            y2: toNode.y,
          },
        ];
      }),
    );

    return {
      width,
      height,
      nodes,
      edges,
    };
  }, [screens]);

  const releaseScreens = useMemo(
    () => simulationDraftToReleaseScreens(draft),
    [draft],
  );
  const validationResult = useMemo(
    () => validateSimulationDraft(draft, language),
    [draft, language],
  );
  const validationErrors = useMemo(
    () => validationResult.issues.filter((issue) => issue.severity === "error"),
    [validationResult.issues],
  );
  const validationWarnings = useMemo(
    () =>
      validationResult.issues.filter((issue) => issue.severity === "warning"),
    [validationResult.issues],
  );
  const isSimpleMode = builderMode === "simple";

  const catalogBuilderHref = buildCatalogHref({
    courseId,
    tab: "builder",
    language,
  });
  const storeTypeOptions: Array<{
    value: SimulationStoreType;
    label: string;
  }> = [
    {
      value: "play_market",
      label: labels.targetAppStorePlayMarket,
    },
    {
      value: "rustore",
      label: labels.targetAppStoreRuStore,
    },
    {
      value: "app_store",
      label: labels.targetAppStoreAppStore,
    },
    {
      value: "other",
      label: labels.targetAppStoreOther,
    },
  ];

  const mutateDraft = (updater: (prev: SimulationDraft) => SimulationDraft) => {
    setDraft((prev) => ({
      ...updater(prev),
      updatedAt: nowIso(),
    }));
  };

  const toggleSection = (key: CollapsibleSectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleScenarioTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    mutateDraft((prev) => ({ ...prev, title: value }));
  };

  const updateTargetApp = (patch: Partial<SimulationDraft["targetApp"]>) => {
    mutateDraft((prev) => ({
      ...prev,
      targetApp: {
        ...prev.targetApp,
        ...patch,
      },
    }));
  };

  const handleTargetAppNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const appName = event.target.value;
    updateTargetApp({
      appName,
      packageName: ensurePackageName(draft.targetApp.packageName, appName),
    });
  };

  const handleTargetStoreUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    const storeUrl = event.target.value;
    const detectedStoreType = detectStoreTypeFromUrl(storeUrl);
    updateTargetApp({
      storeUrl,
      storeType: detectedStoreType ?? draft.targetApp.storeType,
    });
  };

  const handleExtractAppFromStoreUrl = async () => {
    if (!draft.targetApp.storeUrl.trim()) {
      setFlash({
        kind: "error",
        message: labels.targetAppExtractFromStoreError,
      });
      return;
    }
    if (hasStoreChallengeMarker(draft.targetApp.storeUrl)) {
      setFlash({
        kind: "error",
        message: labels.targetAppChallengeUrlError,
      });
      return;
    }

    setResolvingStoreApp(true);
    try {
      const resolved = await resolveSimulationStoreAppRemote(
        draft.targetApp.storeUrl,
      );
      if (
        hasStoreChallengeMarker(resolved.appName) ||
        (resolved.canonicalUrl &&
          hasStoreChallengeMarker(resolved.canonicalUrl))
      ) {
        throw new Error(labels.targetAppExtractFromStoreError);
      }

      updateTargetApp({
        appName: resolved.appName,
        packageName: ensurePackageName(resolved.packageName, resolved.appName),
        storeType: resolved.storeType,
        storeUrl: resolved.canonicalUrl ?? draft.targetApp.storeUrl,
        iconUrl: resolved.iconUrl ?? "",
      });
      setFlash({
        kind: "ok",
        message: labels.targetAppExtractFromStoreSuccess,
      });
    } catch (error) {
      const errorMessage = parseErrorMessage(
        error,
        labels.targetAppExtractFromStoreError,
      );
      setFlash({
        kind: "error",
        message: errorMessage,
      });
    } finally {
      setResolvingStoreApp(false);
    }
  };

  const handleSelectMediaAsset = (asset: SimulationMediaAsset) => {
    updateSelectedScreen({ imageUrl: asset.fileUrl });
  };

  const handleMediaFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    if (mediaBindingError) {
      setMediaError(mediaBindingError);
      setMediaInputKey((prev) => prev + 1);
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setMediaUploading(true);
    setMediaError(null);
    try {
      const asset = await uploadSimulationMediaAssetRemote(
        scopeKey,
        file,
        mediaBinding,
      );
      setMediaAssets((prev) => [
        asset,
        ...prev.filter((item) => item.id !== asset.id),
      ]);
      updateSelectedScreen({ imageUrl: asset.fileUrl });
      setFlash({
        kind: "ok",
        message: labels.mediaUploadedAndSelected,
      });
    } catch (error) {
      setMediaError(parseErrorMessage(error, labels.mediaUploadError));
    } finally {
      setMediaUploading(false);
      setMediaInputKey((prev) => prev + 1);
    }
  };

  const refreshLibraryItems = async (searchValue = librarySearchQuery) => {
    setLibraryLoading(true);
    setLibraryError(null);
    try {
      const nextItems = await fetchSimulationLibraryRemote(
        scopeKey,
        searchValue,
      );
      setLibraryItems(nextItems);
    } catch (error) {
      setLibraryError(parseErrorMessage(error, labels.libraryListError));
    } finally {
      setLibraryLoading(false);
    }
  };

  const handleSaveToLibraryAsNew = async () => {
    setLibrarySaving(true);
    setLibraryError(null);
    try {
      const savedItem = await saveSimulationLibraryItemRemote(scopeKey, {
        title: draft.title.trim(),
        draft,
      });
      await refreshLibraryItems();
      setSelectedLibraryItemId(savedItem.id);
      setFlash({
        kind: "ok",
        message: labels.librarySaved,
      });
    } catch (error) {
      setLibraryError(parseErrorMessage(error, labels.librarySaveError));
      setFlash({
        kind: "error",
        message: labels.librarySaveError,
      });
    } finally {
      setLibrarySaving(false);
    }
  };

  const handleUpdateSelectedLibraryItem = async () => {
    if (!selectedLibraryItemId) {
      return;
    }

    setLibraryUpdating(true);
    setLibraryError(null);
    try {
      const updatedItem = await updateSimulationLibraryItemRemote(
        selectedLibraryItemId,
        {
          title: draft.title.trim(),
          draft,
        },
      );
      await refreshLibraryItems();
      setSelectedLibraryItemId(updatedItem.id);
      setFlash({
        kind: "ok",
        message: labels.libraryUpdated,
      });
    } catch (error) {
      setLibraryError(parseErrorMessage(error, labels.libraryUpdateError));
      setFlash({
        kind: "error",
        message: labels.libraryUpdateError,
      });
    } finally {
      setLibraryUpdating(false);
    }
  };

  const handleLoadFromLibrary = async (itemId: string) => {
    setLibraryActionItemId(itemId);
    setLibraryError(null);
    try {
      const loaded = await loadSimulationLibraryItemRemote(itemId);
      if (!loaded) {
        throw new Error(labels.libraryLoadError);
      }
      const nextDraft = sanitizeDraft(loaded);
      setDraft(nextDraft);
      setSelectedLibraryItemId(itemId);
      setSelectedScreenId(
        nextDraft.startScreenId ?? nextDraft.screens[0]?.id ?? null,
      );
      setSelectedHotspotId(null);
      setPreparedJson("[]");
      setPreviewState({
        active: false,
        currentScreenId: null,
        lastHint: "",
        path: [],
      });
      setFlash({
        kind: "ok",
        message: labels.libraryLoaded,
      });
    } catch (error) {
      setLibraryError(parseErrorMessage(error, labels.libraryLoadError));
      setFlash({
        kind: "error",
        message: labels.libraryLoadError,
      });
    } finally {
      setLibraryActionItemId(null);
    }
  };

  const handleDeleteFromLibrary = async (itemId: string) => {
    setLibraryActionItemId(itemId);
    setLibraryError(null);
    try {
      await deleteSimulationLibraryItemRemote(itemId);
      await refreshLibraryItems();
      setSelectedLibraryItemId((prev) => (prev === itemId ? null : prev));
      setFlash({
        kind: "ok",
        message: labels.libraryDeleted,
      });
    } catch (error) {
      setLibraryError(parseErrorMessage(error, labels.libraryDeleteError));
      setFlash({
        kind: "error",
        message: labels.libraryDeleteError,
      });
    } finally {
      setLibraryActionItemId(null);
    }
  };

  const handleAddScreen = () => {
    const nextScreen = createSimulationScreen(screens.length + 1);
    mutateDraft((prev) => ({
      ...prev,
      screens: [...prev.screens, nextScreen],
      startScreenId: prev.startScreenId ?? nextScreen.id,
    }));
    setSelectedScreenId(nextScreen.id);
    setSelectedHotspotId(null);
  };

  const handleApplyPreset = (presetId: SimulationPresetId) => {
    const nextDraft = createSimulationDraftFromPreset(presetId, language);
    setDraft(nextDraft);
    setSelectedScreenId(
      nextDraft.startScreenId ?? nextDraft.screens[0]?.id ?? null,
    );
    setSelectedHotspotId(null);
    setPreviewState({
      active: false,
      currentScreenId: null,
      lastHint: "",
      path: [],
    });
    setPreparedJson("[]");
    setFlash({ kind: "ok", message: labels.presetApplied });
  };

  const handleRemoveScreen = (screenId: string) => {
    if (screens.length <= 1) {
      return;
    }

    mutateDraft((prev) => {
      const nextScreens = prev.screens
        .filter((screen) => screen.id !== screenId)
        .map((screen) => ({
          ...screen,
          hotspots: screen.hotspots.map((hotspot) =>
            hotspot.targetScreenId === screenId
              ? { ...hotspot, targetScreenId: null }
              : hotspot,
          ),
        }));

      return {
        ...prev,
        screens: nextScreens,
        startScreenId:
          prev.startScreenId === screenId
            ? (nextScreens[0]?.id ?? null)
            : prev.startScreenId,
      };
    });

    setSelectedHotspotId(null);
    if (selectedScreenId === screenId) {
      setSelectedScreenId(null);
    }
  };

  const handleMoveScreen = (screenId: string, direction: -1 | 1) => {
    mutateDraft((prev) => {
      const index = prev.screens.findIndex((screen) => screen.id === screenId);
      if (index < 0) {
        return prev;
      }

      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.screens.length) {
        return prev;
      }

      const nextScreens = [...prev.screens];
      [nextScreens[index], nextScreens[targetIndex]] = [
        nextScreens[targetIndex],
        nextScreens[index],
      ];

      return {
        ...prev,
        screens: nextScreens,
      };
    });
  };

  const handleDuplicateScreen = (screenId: string) => {
    const source = screens.find((screen) => screen.id === screenId);
    if (!source) {
      return;
    }

    const seedScreen = createSimulationScreen(screens.length + 1);
    const keySet = new Set(screens.map((screen) => screen.key.trim()));
    const duplicatedKey = getUniqueScreenKey(
      source.key,
      keySet,
      screens.length + 1,
    );
    const duplicatedTitle = source.title.trim()
      ? `${source.title.trim()} (${labels.duplicateSuffix})`
      : `${source.key || "screen"} (${labels.duplicateSuffix})`;

    const duplicatedHotspots = source.hotspots.map((hotspot, index) => ({
      ...hotspot,
      id: createSimulationHotspot(index + 1).id,
    }));

    const duplicatedScreen = {
      ...source,
      id: seedScreen.id,
      key: duplicatedKey,
      title: duplicatedTitle,
      hotspots: duplicatedHotspots,
    };

    mutateDraft((prev) => {
      const sourceIndex = prev.screens.findIndex(
        (screen) => screen.id === screenId,
      );
      if (sourceIndex < 0) {
        return prev;
      }

      const nextScreens = [...prev.screens];
      nextScreens.splice(sourceIndex + 1, 0, duplicatedScreen);
      return {
        ...prev,
        screens: nextScreens,
      };
    });

    setSelectedScreenId(duplicatedScreen.id);
    setSelectedHotspotId(null);
  };

  const handleToggleScreenCompletion = (screenId: string) => {
    mutateDraft((prev) => {
      const current = prev.screens.find((screen) => screen.id === screenId);
      if (!current) {
        return prev;
      }

      const nextCompletion = !current.isCompletion;
      return {
        ...prev,
        screens: prev.screens.map((screen) => {
          if (screen.id === screenId) {
            return { ...screen, isCompletion: nextCompletion };
          }
          if (nextCompletion) {
            return { ...screen, isCompletion: false };
          }
          return screen;
        }),
      };
    });
  };

  const updateSelectedScreen = (
    patch: Partial<SimulationDraft["screens"][number]>,
  ) => {
    if (!selectedScreen) {
      return;
    }

    mutateDraft((prev) => ({
      ...prev,
      screens: prev.screens.map((screen) =>
        screen.id === selectedScreen.id ? { ...screen, ...patch } : screen,
      ),
    }));
  };

  const handleCanvasClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!selectedScreen) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const defaultWidth = 18;
    const defaultHeight = 12;
    const x =
      ((event.clientX - rect.left) / rect.width) * 100 - defaultWidth / 2;
    const y =
      ((event.clientY - rect.top) / rect.height) * 100 - defaultHeight / 2;

    const hotspot = {
      ...createSimulationHotspot(selectedScreen.hotspots.length + 1),
      x: clamp(x, 0, 100 - defaultWidth),
      y: clamp(y, 0, 100 - defaultHeight),
      width: defaultWidth,
      height: defaultHeight,
    };

    mutateDraft((prev) => ({
      ...prev,
      screens: prev.screens.map((screen) =>
        screen.id === selectedScreen.id
          ? {
              ...screen,
              hotspots: [...screen.hotspots, hotspot],
            }
          : screen,
      ),
    }));
    setSelectedHotspotId(hotspot.id);
  };

  const updateSelectedHotspot = (patch: Partial<SimulationHotspotDraft>) => {
    if (!selectedScreen || !selectedHotspot) {
      return;
    }

    mutateDraft((prev) => ({
      ...prev,
      screens: prev.screens.map((screen) =>
        screen.id === selectedScreen.id
          ? {
              ...screen,
              hotspots: screen.hotspots.map((hotspot) =>
                hotspot.id === selectedHotspot.id
                  ? { ...hotspot, ...patch }
                  : hotspot,
              ),
            }
          : screen,
      ),
    }));
  };

  const removeSelectedHotspot = () => {
    if (!selectedScreen || !selectedHotspot) {
      return;
    }

    mutateDraft((prev) => ({
      ...prev,
      screens: prev.screens.map((screen) =>
        screen.id === selectedScreen.id
          ? {
              ...screen,
              hotspots: screen.hotspots.filter(
                (hotspot) => hotspot.id !== selectedHotspot.id,
              ),
            }
          : screen,
      ),
    }));
    setSelectedHotspotId(null);
  };

  const duplicateSelectedHotspot = () => {
    if (!selectedScreen || !selectedHotspot) {
      return;
    }

    const nextHotspot = {
      ...selectedHotspot,
      id: createSimulationHotspot(selectedScreen.hotspots.length + 1).id,
      x: clamp(selectedHotspot.x + 2, 0, 100 - selectedHotspot.width),
      y: clamp(selectedHotspot.y + 2, 0, 100 - selectedHotspot.height),
    };

    mutateDraft((prev) => ({
      ...prev,
      screens: prev.screens.map((screen) =>
        screen.id === selectedScreen.id
          ? {
              ...screen,
              hotspots: [...screen.hotspots, nextHotspot],
            }
          : screen,
      ),
    }));
    setSelectedHotspotId(nextHotspot.id);
  };

  const handleIssueNavigate = (screenId?: string, hotspotId?: string) => {
    if (!screenId) {
      return;
    }

    setSelectedScreenId(screenId);
    setSelectedHotspotId(hotspotId ?? null);
  };

  const handlePrepareJson = () => {
    if (validationResult.hasErrors) {
      setFlash({
        kind: "error",
        message: labels.prepareBlocked(validationErrors.length),
      });
      return;
    }

    const nextJson = JSON.stringify(releaseScreens, null, 2);
    savePreparedReleaseScreens(releaseScreens, scopeKey);
    setPreparedJson(nextJson);
    setFlash({ kind: "ok", message: labels.preparedOk });
  };

  const handleCopyJson = async () => {
    const payload =
      preparedJson.trim() === "[]"
        ? JSON.stringify(releaseScreens, null, 2)
        : preparedJson;

    try {
      await navigator.clipboard.writeText(payload);
      setPreparedJson(payload);
      setFlash({ kind: "ok", message: labels.copiedOk });
    } catch {
      setFlash({ kind: "error", message: labels.copyError });
    }
  };

  const handleResetDraft = () => {
    const fresh = createInitialSimulationDraft();
    clearSimulationDraft(scopeKey);
    setDraft(fresh);
    setSelectedScreenId(fresh.startScreenId);
    setSelectedHotspotId(null);
    setPreparedJson("[]");
    setFlash(null);
    setPreviewState({
      active: false,
      currentScreenId: null,
      lastHint: "",
      path: [],
    });
  };

  const handlePreviewStart = () => {
    const startScreenId = draft.startScreenId ?? screens[0]?.id ?? null;
    if (!startScreenId) {
      return;
    }

    const startTitle = screenById.get(startScreenId)?.title ?? startScreenId;
    setPreviewState({
      active: true,
      currentScreenId: startScreenId,
      lastHint: "",
      path: [startTitle],
    });
  };

  const handlePreviewStop = () => {
    setPreviewState({
      active: false,
      currentScreenId: null,
      lastHint: "",
      path: [],
    });
  };

  const handlePreviewRestart = () => {
    if (!previewState.active) {
      handlePreviewStart();
      return;
    }

    const startScreenId = draft.startScreenId ?? screens[0]?.id ?? null;
    if (!startScreenId) {
      return;
    }

    const startTitle = screenById.get(startScreenId)?.title ?? startScreenId;
    setPreviewState({
      active: true,
      currentScreenId: startScreenId,
      lastHint: "",
      path: [startTitle],
    });
  };

  const handlePreviewHotspotClick = (hotspot: SimulationHotspotDraft) => {
    if (!previewState.active) {
      return;
    }

    if (!hotspot.targetScreenId) {
      setPreviewState((prev) => ({
        ...prev,
        lastHint: hotspot.hint.trim() || labels.previewNoTarget,
      }));
      return;
    }

    const target = screenById.get(hotspot.targetScreenId);
    if (!target) {
      setPreviewState((prev) => ({
        ...prev,
        lastHint: labels.previewNoTarget,
      }));
      return;
    }

    setPreviewState((prev) => ({
      ...prev,
      currentScreenId: target.id,
      lastHint: hotspot.hint.trim() || labels.previewHintFallback,
      path: [...prev.path, target.title || target.key],
    }));
  };

  const syncText = syncState.loading
    ? labels.syncLoading
    : syncState.saving
      ? labels.syncSaving
      : syncState.lastSavedAt
        ? `${labels.syncSavedAt}: ${formatSavedAt(syncState.lastSavedAt, language)}`
        : labels.syncSavedAt;
  const hasAtLeastOneHotspot = screens.some(
    (screen) => screen.hotspots.length > 0,
  );
  const canOpenExportStep = hasAtLeastOneHotspot;
  const isSimpleHotspotsStep = isSimpleMode && simpleStep === "hotspots";
  const canEditHotspots = !isSimpleMode || isSimpleHotspotsStep;
  const simpleHint =
    simpleStep === "screens"
      ? labels.simpleHintScreens
      : simpleStep === "hotspots"
        ? hasAtLeastOneHotspot
          ? labels.simpleHintHotspotsReady
          : labels.simpleHintHotspotsEmpty
        : validationResult.hasErrors
          ? labels.simpleHintExportBlocked
          : labels.simpleHintExportReady;
  const simpleStepOptions: Array<{
    id: SimpleStep;
    label: string;
    disabled?: boolean;
  }> = [
    { id: "screens", label: labels.stepScreens },
    { id: "hotspots", label: labels.stepHotspots },
    { id: "export", label: labels.stepExport, disabled: !canOpenExportStep },
  ];
  const presetCards: Array<{
    id: SimulationPresetId;
    title: string;
    description: string;
  }> = [
    {
      id: "blank",
      title: labels.presetBlankTitle,
      description: labels.presetBlankDescription,
    },
    {
      id: "bank_payment",
      title: labels.presetBankTitle,
      description: labels.presetBankDescription,
    },
    {
      id: "gov_services",
      title: labels.presetGovTitle,
      description: labels.presetGovDescription,
    },
    {
      id: "messenger",
      title: labels.presetMessengerTitle,
      description: labels.presetMessengerDescription,
    },
  ];

  const renderCollapseIcon = (expanded: boolean) => (
    <span
      aria-hidden="true"
      className={`${styles.collapsibleIcon} ${expanded ? styles.collapsibleIconOpen : ""}`}
    >
      <span className={styles.collapsibleGlyph}>⌄</span>
    </span>
  );

  const handleSimpleBack = () => {
    if (simpleStep === "export") {
      setSimpleStep("hotspots");
      return;
    }
    if (simpleStep === "hotspots") {
      setSimpleStep("screens");
    }
  };

  const handleSimpleNext = () => {
    if (simpleStep === "screens") {
      setSimpleStep("hotspots");
      return;
    }
    if (simpleStep === "hotspots" && canOpenExportStep) {
      setSimpleStep("export");
    }
  };

  return (
    <section
      className={`${styles.builder} ${isSimpleMode ? styles.builderSimple : ""}`}
      data-simple-step={isSimpleMode ? simpleStep : undefined}
    >
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{labels.title}</h1>
          <p className={styles.subtitle}>{labels.subtitle}</p>
        </div>
        <div className={styles.headerActions}>
          <p className={styles.syncText}>{syncText}</p>
          {!isSimpleMode ? (
            <button
              className={styles.ghostButton}
              type="button"
              onClick={handleResetDraft}
            >
              {labels.resetDraft}
            </button>
          ) : null}
          <ActionLink
            className={styles.headerCatalogLink}
            href={catalogBuilderHref}
            variant={isSimpleMode ? "secondary" : "primary"}
          >
            {labels.openCatalog}
          </ActionLink>
        </div>
      </header>

      {syncState.error && <p className={styles.syncError}>{syncState.error}</p>}

      <section className={styles.modeBar}>
        <div className={styles.modeSwitch}>
          <button
            className={`${styles.modeButton} ${isSimpleMode ? styles.modeButtonActive : ""}`}
            type="button"
            onClick={() => {
              setBuilderMode("simple");
              setSimpleStep("screens");
            }}
          >
            {labels.modeSimple}
          </button>
          <button
            className={`${styles.modeButton} ${!isSimpleMode ? styles.modeButtonActive : ""}`}
            type="button"
            onClick={() => setBuilderMode("advanced")}
          >
            {labels.modeAdvanced}
          </button>
        </div>
        {isSimpleMode && (
          <>
            <StepSwitcher
              activeId={simpleStep}
              items={simpleStepOptions}
              onSelect={(id) => setSimpleStep(id as SimpleStep)}
            />
            <p className={styles.simpleHint}>{simpleHint}</p>
          </>
        )}
      </section>

      <label className={styles.scenarioTitleField}>
        <span>{labels.scenarioTitle}</span>
        <input
          value={draft.title}
          onChange={handleScenarioTitleChange}
          placeholder={labels.scenarioPlaceholder}
        />
      </label>

      <section className={styles.targetAppCard}>
        <button
          aria-controls="simulation-target-app"
          aria-expanded={expandedSections.targetApp}
          className={styles.collapsibleToggle}
          type="button"
          onClick={() => toggleSection("targetApp")}
        >
          <span className={styles.collapsibleTitle}>
            {labels.targetAppTitle}
          </span>
          {renderCollapseIcon(expandedSections.targetApp)}
        </button>

        {expandedSections.targetApp ? (
          <>
            <p className={styles.graphHint} id="simulation-target-app">
              {labels.targetAppHint}
            </p>

            <div className={styles.targetAppGrid}>
              <label className={styles.targetAppNameField}>
                <span>{labels.targetAppName}</span>
                <div className={styles.targetAppIdentityRow}>
                  <span className={styles.targetAppIconSlot}>
                    {draft.targetApp.iconUrl.trim() ? (
                      <img
                        alt={labels.targetAppIconAlt}
                        className={styles.targetAppIcon}
                        decoding="async"
                        draggable={false}
                        src={draft.targetApp.iconUrl}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className={styles.targetAppIconFallback}
                      >
                        ⬡
                      </span>
                    )}
                  </span>
                  <input
                    className={styles.targetAppIdentityInput}
                    value={draft.targetApp.appName}
                    onChange={handleTargetAppNameChange}
                    placeholder={labels.targetAppNamePlaceholder}
                  />
                </div>
              </label>

              <label>
                <span>{labels.targetAppStoreType}</span>
                <select
                  value={draft.targetApp.storeType}
                  onChange={(event) =>
                    updateTargetApp({
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
                <span>{labels.targetAppMinVersion}</span>
                <input
                  value={draft.targetApp.minSupportedVersion}
                  onChange={(event) =>
                    updateTargetApp({ minSupportedVersion: event.target.value })
                  }
                  placeholder="1.0.0"
                />
              </label>

              <label>
                <span>{labels.targetAppMaxVersion}</span>
                <input
                  value={draft.targetApp.maxSupportedVersion}
                  onChange={(event) =>
                    updateTargetApp({ maxSupportedVersion: event.target.value })
                  }
                  placeholder="1.0.0"
                />
              </label>

              <label>
                <span>{labels.targetAppReleasedAt}</span>
                <input
                  type="date"
                  value={draft.targetApp.releasedAt}
                  onChange={(event) =>
                    updateTargetApp({ releasedAt: event.target.value })
                  }
                />
              </label>

              <label className={styles.targetAppUrlField}>
                <span>{labels.targetAppStoreUrl}</span>
                <input
                  value={draft.targetApp.storeUrl}
                  onChange={handleTargetStoreUrlChange}
                  placeholder="https://..."
                />
                <button
                  className={styles.inlineButton}
                  type="button"
                  onClick={handleExtractAppFromStoreUrl}
                  disabled={
                    resolvingStoreApp || !draft.targetApp.storeUrl.trim()
                  }
                >
                  {resolvingStoreApp
                    ? labels.targetAppResolveLoading
                    : labels.targetAppExtractFromStore}
                </button>
              </label>
            </div>
            <p className={styles.targetAppHelper}>
              {labels.targetAppStoreUrlHint}
            </p>
          </>
        ) : null}
      </section>

      <p className={styles.scopeBadge}>
        <span>{labels.scopeTitle}:</span>
        <strong>{scopeLabel}</strong>
      </p>

      <div className={styles.workspace}>
        <aside className={styles.panel} data-simple-section="screens">
          <section className={styles.libraryBlock}>
            <button
              aria-expanded={expandedSections.library}
              className={styles.collapsibleToggle}
              type="button"
              onClick={() => toggleSection("library")}
            >
              <span className={styles.collapsibleTitle}>
                {labels.libraryTitle}
              </span>
              {renderCollapseIcon(expandedSections.library)}
            </button>
            {expandedSections.library ? (
              <>
                <p className={styles.graphHint}>{labels.libraryHint}</p>
                <div className={styles.libraryToolbar}>
                  <input
                    className={styles.librarySearchInput}
                    value={librarySearchQuery}
                    onChange={(event) =>
                      setLibrarySearchQuery(event.target.value)
                    }
                    placeholder={labels.librarySearchPlaceholder}
                  />
                  <div className={styles.libraryToolbarActions}>
                    <ActionButton
                      variant="secondary"
                      onClick={handleSaveToLibraryAsNew}
                      disabled={librarySaving || libraryUpdating}
                    >
                      {librarySaving
                        ? labels.librarySaving
                        : labels.librarySaveAsNew}
                    </ActionButton>
                    <ActionButton
                      variant="secondary"
                      onClick={handleUpdateSelectedLibraryItem}
                      disabled={
                        !selectedLibraryItemId ||
                        librarySaving ||
                        libraryUpdating ||
                        Boolean(libraryActionItemId)
                      }
                    >
                      {libraryUpdating
                        ? labels.libraryUpdating
                        : labels.libraryUpdateSelected}
                    </ActionButton>
                  </div>
                </div>
                {libraryError ? (
                  <p className={styles.mediaError}>{libraryError}</p>
                ) : null}
                {libraryLoading ? (
                  <p className={styles.emptyInline}>{labels.libraryLoading}</p>
                ) : libraryItems.length === 0 ? (
                  <p className={styles.emptyInline}>{labels.libraryEmpty}</p>
                ) : (
                  <div className={styles.libraryList}>
                    {libraryItems.map((item) => (
                      <article
                        className={`${styles.libraryItem} ${selectedLibraryItemId === item.id ? styles.libraryItemSelected : ""}`}
                        key={item.id}
                        onClick={() => setSelectedLibraryItemId(item.id)}
                      >
                        <header className={styles.libraryItemHeader}>
                          <strong>{item.title}</strong>
                          <span>
                            {labels.libraryUpdatedAt}:{" "}
                            {formatDateTime(item.updatedAt, language)}
                          </span>
                        </header>
                        {selectedLibraryItemId === item.id ? (
                          <p className={styles.libraryItemTag}>
                            {labels.librarySelectedTag}
                          </p>
                        ) : null}
                        <p className={styles.libraryItemMeta}>
                          {item.targetAppName?.trim() ||
                            labels.libraryTargetAppFallback}
                        </p>
                        <div className={styles.libraryItemActions}>
                          <ActionButton
                            variant="secondary"
                            onClick={() => handleLoadFromLibrary(item.id)}
                            disabled={libraryActionItemId === item.id}
                          >
                            {labels.libraryLoad}
                          </ActionButton>
                          <ActionButton
                            variant="danger"
                            onClick={() => handleDeleteFromLibrary(item.id)}
                            disabled={libraryActionItemId === item.id}
                          >
                            {labels.libraryDelete}
                          </ActionButton>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </section>

          <section className={styles.presetsBlock}>
            <button
              aria-expanded={expandedSections.presets}
              className={styles.collapsibleToggle}
              type="button"
              onClick={() => toggleSection("presets")}
            >
              <span className={styles.collapsibleTitle}>
                {labels.presetsTitle}
              </span>
              {renderCollapseIcon(expandedSections.presets)}
            </button>
            {expandedSections.presets ? (
              <>
                <p className={styles.graphHint}>{labels.presetsHint}</p>
                <div className={styles.presetGrid}>
                  {presetCards.map((preset) => (
                    <article className={styles.presetCard} key={preset.id}>
                      <h3>{preset.title}</h3>
                      <p>{preset.description}</p>
                      <ActionButton
                        className={styles.presetApplyButton}
                        variant="secondary"
                        onClick={() => handleApplyPreset(preset.id)}
                      >
                        {labels.presetApply}
                      </ActionButton>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </section>

          <div className={styles.panelHeader}>
            <h2>{labels.screens}</h2>
            <button
              className={styles.inlineButton}
              type="button"
              onClick={handleAddScreen}
            >
              {labels.addScreen}
            </button>
          </div>

          <div className={styles.screenList}>
            {screens.map((screen, index) => {
              const isActive = selectedScreen?.id === screen.id;
              const isStart = draft.startScreenId === screen.id;
              return (
                <article
                  className={`${styles.screenCard} ${isActive ? styles.screenCardActive : ""}`}
                  key={screen.id}
                >
                  <button
                    className={styles.screenSelect}
                    type="button"
                    onClick={() => {
                      setSelectedScreenId(screen.id);
                      setSelectedHotspotId(null);
                    }}
                  >
                    <strong>{`${screen.title || screen.key}${screen.isCompletion ? " ✓" : ""}`}</strong>
                    <span>{screen.hotspots.length}</span>
                  </button>
                  <div className={styles.screenActions}>
                    <button
                      className={`${styles.inlineButton} ${isStart ? styles.startButtonActive : ""}`}
                      type="button"
                      onClick={() =>
                        mutateDraft((prev) => ({
                          ...prev,
                          startScreenId: screen.id,
                        }))
                      }
                    >
                      {labels.startScreen}
                    </button>
                    <button
                      className={`${styles.inlineButton} ${screen.isCompletion ? styles.startButtonActive : ""}`}
                      type="button"
                      onClick={() => handleToggleScreenCompletion(screen.id)}
                    >
                      {screen.isCompletion
                        ? labels.screenUnmarkCompletion
                        : labels.screenMarkCompletion}
                    </button>
                    <button
                      className={styles.inlineButton}
                      data-advanced="true"
                      type="button"
                      onClick={() => handleMoveScreen(screen.id, -1)}
                      disabled={index === 0}
                    >
                      {labels.moveScreenUp}
                    </button>
                    <button
                      className={styles.inlineButton}
                      data-advanced="true"
                      type="button"
                      onClick={() => handleMoveScreen(screen.id, 1)}
                      disabled={index === screens.length - 1}
                    >
                      {labels.moveScreenDown}
                    </button>
                    <button
                      className={styles.inlineButton}
                      data-advanced="true"
                      type="button"
                      onClick={() => handleDuplicateScreen(screen.id)}
                    >
                      {labels.duplicateScreen}
                    </button>
                    <button
                      className={styles.inlineButton}
                      type="button"
                      onClick={() => handleRemoveScreen(screen.id)}
                      disabled={screens.length <= 1}
                    >
                      {labels.removeScreen}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </aside>

        <section className={styles.canvasPanel} data-simple-section="canvas">
          {!selectedScreen ? (
            <div className={styles.emptyState}>{labels.noScreen}</div>
          ) : (
            <>
              <div className={styles.screenFields}>
                <label data-advanced="true">
                  <span>{labels.screenKey}</span>
                  <input
                    value={selectedScreen.key}
                    onChange={(event) =>
                      updateSelectedScreen({ key: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>{labels.screenTitle}</span>
                  <input
                    value={selectedScreen.title}
                    onChange={(event) =>
                      updateSelectedScreen({ title: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>{labels.screenImageUrl}</span>
                  <input
                    value={selectedScreen.imageUrl}
                    onChange={(event) =>
                      updateSelectedScreen({ imageUrl: event.target.value })
                    }
                    placeholder="https://..."
                  />
                </label>
              </div>

              <section className={styles.mediaLibrary}>
                <button
                  aria-expanded={expandedSections.media}
                  className={styles.collapsibleToggle}
                  type="button"
                  onClick={() => toggleSection("media")}
                >
                  <span className={styles.collapsibleTitle}>
                    {labels.mediaLibraryTitle}
                  </span>
                  {renderCollapseIcon(expandedSections.media)}
                </button>
                {expandedSections.media ? (
                  <>
                    <div className={styles.mediaToolbar}>
                      <input
                        className={styles.mediaSearchInput}
                        value={mediaSearchQuery}
                        onChange={(event) =>
                          setMediaSearchQuery(event.target.value)
                        }
                        disabled={Boolean(mediaBindingError)}
                        placeholder={labels.mediaSearchPlaceholder}
                      />
                      <label className={styles.mediaUploadButton}>
                        <input
                          key={mediaInputKey}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          disabled={
                            mediaUploading || Boolean(mediaBindingError)
                          }
                          onChange={handleMediaFileChange}
                        />
                        {mediaUploading
                          ? labels.mediaUploading
                          : labels.mediaUploadLabel}
                      </label>
                    </div>

                    {mediaBindingError ? (
                      <p className={styles.mediaNotice}>{mediaBindingError}</p>
                    ) : null}

                    {mediaError ? (
                      <p className={styles.mediaError}>{mediaError}</p>
                    ) : null}

                    {mediaBindingError ? null : mediaLoading ? (
                      <p className={styles.emptyInline}>
                        {labels.mediaLoading}
                      </p>
                    ) : mediaAssets.length === 0 ? (
                      <p className={styles.emptyInline}>{labels.mediaEmpty}</p>
                    ) : (
                      <div className={styles.mediaGrid}>
                        {mediaAssets.map((asset) => (
                          <article className={styles.mediaCard} key={asset.id}>
                            <div className={styles.mediaPreviewFrame}>
                              <img
                                alt={asset.originalFilename}
                                className={styles.mediaPreview}
                                src={asset.fileUrl}
                              />
                            </div>
                            <p className={styles.mediaName}>
                              {formatMediaDisplayName(asset.originalFilename)}
                            </p>
                            <ActionButton
                              className={styles.mediaChooseButton}
                              variant="secondary"
                              onClick={() => handleSelectMediaAsset(asset)}
                            >
                              {labels.mediaChoose}
                            </ActionButton>
                          </article>
                        ))}
                      </div>
                    )}
                  </>
                ) : null}
              </section>

              <p className={styles.canvasHint}>
                {canEditHotspots ? labels.canvasHint : labels.screenPreviewHint}
              </p>

              <div className={styles.canvasFrame}>
                <div
                  className={`${styles.canvasStage} ${!canEditHotspots ? styles.canvasStageReadonly : ""}`}
                  role="presentation"
                  onClick={canEditHotspots ? handleCanvasClick : undefined}
                >
                  {selectedScreen.imageUrl.trim() ? (
                    <img
                      alt={selectedScreen.title || selectedScreen.key}
                      className={styles.canvasImage}
                      src={selectedScreen.imageUrl}
                    />
                  ) : (
                    <div className={styles.canvasEmpty}>
                      {labels.canvasEmpty}
                    </div>
                  )}

                  {canEditHotspots
                    ? selectedScreen.hotspots.map((hotspot) => (
                        <button
                          className={`${styles.hotspot} ${selectedHotspot?.id === hotspot.id ? styles.hotspotActive : ""}`}
                          key={hotspot.id}
                          style={{
                            left: `${hotspot.x}%`,
                            top: `${hotspot.y}%`,
                            width: `${hotspot.width}%`,
                            height: `${hotspot.height}%`,
                          }}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedHotspotId(hotspot.id);
                          }}
                        >
                          <span>{hotspot.label}</span>
                        </button>
                      ))
                    : null}
                </div>
              </div>

              <section className={styles.graphPanel} data-advanced="true">
                <button
                  aria-expanded={expandedSections.graph}
                  className={styles.collapsibleToggle}
                  type="button"
                  onClick={() => toggleSection("graph")}
                >
                  <span className={styles.collapsibleTitle}>
                    {labels.graphTitle}
                  </span>
                  {renderCollapseIcon(expandedSections.graph)}
                </button>
                {expandedSections.graph ? (
                  <>
                    <p className={styles.graphHint}>{labels.graphHint}</p>

                    <div className={styles.graphViewport}>
                      <svg
                        className={styles.graphSvg}
                        viewBox={`0 0 ${graph.width} ${graph.height}`}
                        preserveAspectRatio="xMinYMin meet"
                      >
                        {graph.edges.map((edge) => (
                          <line
                            key={edge.key}
                            x1={edge.x1}
                            y1={edge.y1}
                            x2={edge.x2}
                            y2={edge.y2}
                          />
                        ))}
                      </svg>

                      {graph.nodes.map((node) => (
                        <button
                          key={node.id}
                          className={`${styles.graphNode} ${selectedScreen?.id === node.id ? styles.graphNodeActive : ""}`}
                          style={{
                            left: `${(node.x / graph.width) * 100}%`,
                            top: `${(node.y / graph.height) * 100}%`,
                          }}
                          type="button"
                          onClick={() => {
                            setSelectedScreenId(node.id);
                            setSelectedHotspotId(null);
                          }}
                        >
                          <strong>{node.title}</strong>
                          {draft.startScreenId === node.id && (
                            <span>{labels.startScreen}</span>
                          )}
                          {node.isCompletion && (
                            <span>{labels.screenCompletion}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </section>
            </>
          )}
        </section>

        <aside className={styles.panel} data-simple-section="hotspots">
          <div className={styles.panelHeader}>
            <h2>{labels.hotspotListTitle}</h2>
          </div>

          <div className={styles.hotspotList}>
            {!selectedScreen || selectedScreen.hotspots.length === 0 ? (
              <p className={styles.emptyInline}>{labels.noHotspots}</p>
            ) : (
              selectedScreen.hotspots.map((hotspot) => (
                <button
                  className={`${styles.hotspotRow} ${selectedHotspot?.id === hotspot.id ? styles.hotspotRowActive : ""}`}
                  key={hotspot.id}
                  type="button"
                  onClick={() => setSelectedHotspotId(hotspot.id)}
                >
                  <strong>{hotspot.label}</strong>
                  <span>{labels.selectHotspot}</span>
                </button>
              ))
            )}
          </div>

          {selectedHotspot && selectedScreen ? (
            <section className={styles.editorBlock}>
              <button
                aria-expanded={expandedSections.hotspotEditor}
                className={styles.collapsibleToggle}
                type="button"
                onClick={() => toggleSection("hotspotEditor")}
              >
                <span className={styles.collapsibleTitle}>
                  {labels.hotspotEditorTitle}
                </span>
                {renderCollapseIcon(expandedSections.hotspotEditor)}
              </button>

              {expandedSections.hotspotEditor ? (
                <>
                  <label>
                    <span>{labels.hotspotLabel}</span>
                    <input
                      value={selectedHotspot.label}
                      onChange={(event) =>
                        updateSelectedHotspot({ label: event.target.value })
                      }
                    />
                  </label>

                  <label>
                    <span>{labels.hotspotHint}</span>
                    <textarea
                      value={selectedHotspot.hint}
                      onChange={(event) =>
                        updateSelectedHotspot({ hint: event.target.value })
                      }
                    />
                  </label>

                  <div className={styles.hotspotGrid} data-advanced="true">
                    <label>
                      <span>{labels.hotspotX}</span>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedHotspot.x}
                        onChange={(event) =>
                          updateSelectedHotspot({
                            x: clamp(
                              toNumber(event.target.value, selectedHotspot.x),
                              0,
                              100,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>{labels.hotspotY}</span>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedHotspot.y}
                        onChange={(event) =>
                          updateSelectedHotspot({
                            y: clamp(
                              toNumber(event.target.value, selectedHotspot.y),
                              0,
                              100,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>{labels.hotspotWidth}</span>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedHotspot.width}
                        onChange={(event) =>
                          updateSelectedHotspot({
                            width: clamp(
                              toNumber(
                                event.target.value,
                                selectedHotspot.width,
                              ),
                              1,
                              100,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>{labels.hotspotHeight}</span>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedHotspot.height}
                        onChange={(event) =>
                          updateSelectedHotspot({
                            height: clamp(
                              toNumber(
                                event.target.value,
                                selectedHotspot.height,
                              ),
                              1,
                              100,
                            ),
                          })
                        }
                      />
                    </label>
                  </div>

                  <label>
                    <span>{labels.hotspotTarget}</span>
                    <select
                      value={selectedHotspot.targetScreenId ?? ""}
                      onChange={(event) =>
                        updateSelectedHotspot({
                          targetScreenId: event.target.value || null,
                        })
                      }
                    >
                      <option value="">{labels.hotspotTargetNone}</option>
                      {screens
                        .filter((screen) => screen.id !== selectedScreen.id)
                        .map((screen) => (
                          <option key={screen.id} value={screen.id}>
                            {screen.title}
                          </option>
                        ))}
                    </select>
                  </label>

                  <div className={styles.editorActions}>
                    <button
                      className={styles.inlineButton}
                      data-advanced="true"
                      type="button"
                      onClick={duplicateSelectedHotspot}
                    >
                      {labels.duplicateHotspot}
                    </button>
                    <button
                      className={styles.dangerButton}
                      type="button"
                      onClick={removeSelectedHotspot}
                    >
                      {labels.removeHotspot}
                    </button>
                  </div>
                </>
              ) : null}
            </section>
          ) : null}

          <section className={styles.transitionsBlock} data-advanced="true">
            <button
              aria-expanded={expandedSections.transitions}
              className={styles.collapsibleToggle}
              type="button"
              onClick={() => toggleSection("transitions")}
            >
              <span className={styles.collapsibleTitle}>
                {labels.transitionsTitle}
              </span>
              {renderCollapseIcon(expandedSections.transitions)}
            </button>
            {expandedSections.transitions ? (
              transitions.length === 0 ? (
                <p className={styles.emptyInline}>{labels.noTransitions}</p>
              ) : (
                <ul>
                  {transitions.map((transition, index) => (
                    <li key={`${transition.fromScreenTitle}-${index}`}>
                      <span>{transition.fromScreenTitle}</span>
                      <strong>{transition.fromHotspotLabel}</strong>
                      <span>{transition.toScreenTitle}</span>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </section>

          <section className={styles.validationPanel} data-advanced="true">
            <button
              aria-expanded={expandedSections.validation}
              className={styles.collapsibleToggle}
              type="button"
              onClick={() => toggleSection("validation")}
            >
              <span className={styles.collapsibleTitle}>
                {labels.validationTitle}
              </span>
              {renderCollapseIcon(expandedSections.validation)}
            </button>
            {expandedSections.validation ? (
              <>
                <p className={styles.graphHint}>{labels.validationHint}</p>

                {validationResult.issues.length === 0 ? (
                  <p className={styles.validationOk}>
                    {labels.validationNoIssues}
                  </p>
                ) : (
                  <>
                    {validationErrors.length > 0 ? (
                      <p className={styles.validationError}>
                        {labels.validationErrorsSummary(
                          validationErrors.length,
                        )}
                      </p>
                    ) : null}
                    {validationWarnings.length > 0 ? (
                      <p className={styles.validationWarning}>
                        {labels.validationWarningsSummary(
                          validationWarnings.length,
                        )}
                      </p>
                    ) : null}
                    <ul className={styles.validationList}>
                      {validationResult.issues.map((issue) => (
                        <li key={issue.id}>
                          <p>{issue.message}</p>
                          {issue.screenId ? (
                            <button
                              className={styles.inlineButton}
                              type="button"
                              onClick={() =>
                                handleIssueNavigate(
                                  issue.screenId,
                                  issue.hotspotId,
                                )
                              }
                            >
                              {labels.validationJumpTo}
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            ) : null}
          </section>
        </aside>
      </div>

      {isSimpleMode && (
        <nav className={styles.simpleFlowNav}>
          <ActionButton
            className={styles.simpleFlowButton}
            variant="secondary"
            disabled={simpleStep === "screens"}
            onClick={handleSimpleBack}
          >
            {labels.simpleBack}
          </ActionButton>
          {simpleStep !== "export" ? (
            <ActionButton
              className={styles.simpleFlowButton}
              variant="primary"
              disabled={simpleStep === "hotspots" && !canOpenExportStep}
              onClick={handleSimpleNext}
            >
              {simpleStep === "screens"
                ? labels.simpleNextHotspots
                : labels.simpleNextExport}
            </ActionButton>
          ) : null}
        </nav>
      )}

      <section className={styles.previewPanel} data-advanced="true">
        <button
          aria-expanded={expandedSections.preview}
          className={styles.collapsibleToggle}
          type="button"
          onClick={() => toggleSection("preview")}
        >
          <span className={styles.collapsibleTitle}>{labels.previewTitle}</span>
          {renderCollapseIcon(expandedSections.preview)}
        </button>

        {expandedSections.preview ? (
          <>
            <div className={styles.previewActions}>
              {!previewState.active ? (
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={handlePreviewStart}
                >
                  {labels.previewStart}
                </button>
              ) : (
                <>
                  <button
                    className={styles.inlineButton}
                    type="button"
                    onClick={handlePreviewRestart}
                  >
                    {labels.previewResetPath}
                  </button>
                  <button
                    className={styles.dangerButton}
                    type="button"
                    onClick={handlePreviewStop}
                  >
                    {labels.previewStop}
                  </button>
                </>
              )}
            </div>

            {!previewState.active || !previewScreen ? (
              <p className={styles.emptyInline}>{labels.previewInactive}</p>
            ) : (
              <>
                <div className={styles.previewStage}>
                  {previewScreen.imageUrl.trim() ? (
                    <img
                      alt={previewScreen.title || previewScreen.key}
                      className={styles.previewImage}
                      src={previewScreen.imageUrl}
                    />
                  ) : (
                    <div className={styles.canvasEmpty}>
                      {labels.canvasEmpty}
                    </div>
                  )}

                  {previewScreen.hotspots.map((hotspot) => (
                    <button
                      key={hotspot.id}
                      className={styles.previewHotspot}
                      style={{
                        left: `${hotspot.x}%`,
                        top: `${hotspot.y}%`,
                        width: `${hotspot.width}%`,
                        height: `${hotspot.height}%`,
                      }}
                      type="button"
                      onClick={() => handlePreviewHotspotClick(hotspot)}
                    >
                      <span>{hotspot.label}</span>
                    </button>
                  ))}
                </div>

                <p className={styles.previewHint}>
                  {previewState.lastHint || labels.previewHintFallback}
                </p>

                <div className={styles.previewPath}>
                  <p>{labels.previewPathTitle}</p>
                  <ul>
                    {previewState.path.map((step, index) => (
                      <li key={`${step}-${index}`}>{step}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </>
        ) : null}
      </section>

      <section className={styles.exportPanel} data-simple-section="export">
        <button
          aria-expanded={expandedSections.export}
          className={styles.collapsibleToggle}
          type="button"
          onClick={() => toggleSection("export")}
        >
          <span className={styles.collapsibleTitle}>{labels.stepExport}</span>
          {renderCollapseIcon(expandedSections.export)}
        </button>
        {expandedSections.export ? (
          <>
            <div className={styles.exportActions}>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={handlePrepareJson}
                disabled={validationResult.hasErrors}
              >
                {labels.prepareJson}
              </button>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={handleCopyJson}
              >
                {labels.copyJson}
              </button>
            </div>

            {isSimpleMode && (
              <p
                className={`${styles.validationCompact} ${validationResult.hasErrors ? styles.validationCompactError : styles.validationCompactOk}`}
              >
                {validationResult.issues.length === 0
                  ? labels.validationCompactOk
                  : labels.validationCompactIssues(
                      validationErrors.length,
                      validationWarnings.length,
                    )}
              </p>
            )}

            {flash && (
              <p
                className={`${styles.flash} ${flash.kind === "ok" ? styles.flashOk : styles.flashError}`}
              >
                {flash.message}
              </p>
            )}

            <label className={styles.exportField}>
              <span>{labels.jsonLabel}</span>
              <textarea readOnly value={preparedJson} />
            </label>
          </>
        ) : null}
      </section>
    </section>
  );
}
