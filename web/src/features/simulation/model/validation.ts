import type { AppLanguage } from "@/shared/i18n/lang";

import { deriveAppNameFromPackageName, ensurePackageName } from "./app-id";
import { toReleaseScreenKey } from "./keys";
import type {
  SimulationDraft,
  SimulationHotspotDraft,
  SimulationScreenDraft,
  SimulationTargetAppDraft,
} from "./types";

export type SimulationIssueSeverity = "error" | "warning";

export type SimulationIssue = {
  id: string;
  severity: SimulationIssueSeverity;
  message: string;
  screenId?: string;
  hotspotId?: string;
};

export type SimulationValidationResult = {
  hasErrors: boolean;
  issues: SimulationIssue[];
};

type DraftMessages = {
  missingAppName: string;
  invalidVersionFormat: string;
  invalidVersionRange: string;
  invalidReleasedAt: string;
  noScreens: string;
  invalidStartScreen: string;
  duplicateScreenKey: (key: string) => string;
  missingScreenTitle: (index: number) => string;
  hotspotBounds: (label: string) => string;
  unknownTarget: (label: string) => string;
  unreachableScreens: (count: number) => string;
  deadEndScreen: (title: string) => string;
  noTransitions: string;
  startWithoutOutgoing: string;
  noCompletionScreens: string;
  unreachableCompletionScreens: string;
  completionWithOutgoing: (title: string) => string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeString(
  value: unknown,
  fallback: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  if (!normalized) {
    return fallback;
  }
  return normalized.slice(0, maxLength);
}

function normalizeNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

function normalizeHotspot(
  value: unknown,
  index: number,
): SimulationHotspotDraft | null {
  const source = asRecord(value);
  if (!source) {
    return null;
  }

  const id = normalizeString(source.id, `hotspot_${index + 1}`, 120);
  const label = normalizeString(source.label, `Зона ${index + 1}`, 200);
  const hint = normalizeString(source.hint, "", 4_000);
  const target =
    typeof source.targetScreenId === "string"
      ? normalizeString(source.targetScreenId, "", 120)
      : null;

  return {
    id,
    label,
    hint,
    x: normalizeNumber(source.x, 10),
    y: normalizeNumber(source.y, 10),
    width: normalizeNumber(source.width, 18),
    height: normalizeNumber(source.height, 12),
    targetScreenId: target || null,
  };
}

function normalizeScreen(
  value: unknown,
  index: number,
): SimulationScreenDraft | null {
  const source = asRecord(value);
  if (!source) {
    return null;
  }

  const rawHotspots = Array.isArray(source.hotspots) ? source.hotspots : [];
  const hotspots = rawHotspots
    .map((hotspot, hotspotIndex) => normalizeHotspot(hotspot, hotspotIndex))
    .filter((hotspot): hotspot is SimulationHotspotDraft => hotspot !== null);

  const id = normalizeString(source.id, `screen_${index + 1}`, 120);
  const titleFallback = `Экран ${index + 1}`;

  return {
    id,
    key: normalizeString(source.key, `screen_${index + 1}`, 120),
    title: normalizeString(source.title, titleFallback, 255),
    imageUrl: normalizeString(source.imageUrl, "", 4_000),
    isCompletion: normalizeBoolean(source.isCompletion, false),
    hotspots,
  };
}

function normalizeTargetApp(value: unknown): SimulationTargetAppDraft {
  const source = asRecord(value);
  const allowedStoreTypes = [
    "play_market",
    "rustore",
    "app_store",
    "other",
  ] as const;
  const storeType =
    typeof source?.storeType === "string" &&
    allowedStoreTypes.includes(
      source.storeType as (typeof allowedStoreTypes)[number],
    )
      ? (source.storeType as SimulationTargetAppDraft["storeType"])
      : "other";

  const rawPackage = normalizeString(source?.packageName, "", 255);
  const appName = normalizeString(
    source?.appName,
    deriveAppNameFromPackageName(rawPackage, "Новое приложение"),
    255,
  );
  const packageName = ensurePackageName(rawPackage, appName);

  return {
    appName,
    packageName,
    storeType,
    storeUrl: normalizeString(source?.storeUrl, "", 500),
    iconUrl: normalizeString(source?.iconUrl, "", 1_000),
    minSupportedVersion: normalizeString(
      source?.minSupportedVersion,
      "1.0.0",
      40,
    ),
    maxSupportedVersion: normalizeString(
      source?.maxSupportedVersion,
      "1.0.0",
      40,
    ),
    releasedAt: normalizeString(source?.releasedAt, "", 20),
  };
}

export function normalizeSimulationDraft(
  value: unknown,
): SimulationDraft | null {
  const source = asRecord(value);
  if (!source) {
    return null;
  }

  if (source.version !== 1 || !Array.isArray(source.screens)) {
    return null;
  }

  const screens = source.screens
    .map((screen, index) => normalizeScreen(screen, index))
    .filter((screen): screen is SimulationScreenDraft => screen !== null);

  if (screens.length === 0) {
    return null;
  }

  const screenIds = new Set(screens.map((screen) => screen.id));
  const rawStartScreenId =
    typeof source.startScreenId === "string"
      ? normalizeString(source.startScreenId, "", 120)
      : null;
  const startScreenId =
    rawStartScreenId && screenIds.has(rawStartScreenId)
      ? rawStartScreenId
      : screens[0].id;

  const updatedAt =
    typeof source.updatedAt === "string" && source.updatedAt.trim()
      ? source.updatedAt
      : new Date().toISOString();
  const libraryItemId =
    typeof source.libraryItemId === "string" && source.libraryItemId.trim()
      ? normalizeString(source.libraryItemId, "", 120)
      : null;

  return {
    version: 1,
    title: normalizeString(source.title, "Новый сценарий", 255),
    targetApp: normalizeTargetApp(source.targetApp),
    startScreenId,
    screens,
    libraryItemId,
    updatedAt,
  };
}

export function isSimulationDraft(value: unknown): value is SimulationDraft {
  return normalizeSimulationDraft(value) !== null;
}

function createMessageSet(language: AppLanguage): DraftMessages {
  if (language === "ru") {
    return {
      missingAppName: "Укажите название приложения.",
      invalidVersionFormat:
        "Версии должны быть в формате X.Y.Z (например: 8.21.0).",
      invalidVersionRange:
        "Минимальная версия должна быть меньше или равна максимальной.",
      invalidReleasedAt: "Дата release_at должна быть в формате YYYY-MM-DD.",
      noScreens: "Добавьте хотя бы один экран.",
      invalidStartScreen: "Стартовый экран не выбран или удален.",
      duplicateScreenKey: (key: string) =>
        `Ключ экрана дублируется: ${key}. Ключи должны быть уникальными.`,
      missingScreenTitle: (index: number) =>
        `У экрана #${index + 1} отсутствует название.`,
      hotspotBounds: (label: string) =>
        `Зона «${label}» выходит за границы экрана (допустимо 0..100%).`,
      unknownTarget: (label: string) =>
        `Зона «${label}» ссылается на несуществующий экран.`,
      unreachableScreens: (count: number) =>
        `Есть недостижимые экраны: ${count}. Они не доступны из стартового экрана.`,
      deadEndScreen: (title: string) =>
        `Экран «${title}» является тупиком (нет переходов дальше).`,
      noTransitions:
        "В сценарии нет переходов между экранами. Пользователь не сможет пройти путь.",
      startWithoutOutgoing:
        "У стартового экрана нет переходов. Добавьте хотя бы одну ведущую зону.",
      noCompletionScreens:
        "Нет финального экрана. Отметьте хотя бы один экран как «Финальный».",
      unreachableCompletionScreens:
        "Финальные экраны недостижимы из стартового. Проверьте переходы.",
      completionWithOutgoing: (title: string) =>
        `Финальный экран «${title}» содержит исходящие переходы.`,
    };
  }

  return {
    missingAppName: "Provide application name.",
    invalidVersionFormat: "Versions must use X.Y.Z format (example: 8.21.0).",
    invalidVersionRange:
      "Minimum supported version must be less than or equal to maximum version.",
    invalidReleasedAt: "release_at must use YYYY-MM-DD format.",
    noScreens: "Add at least one screen.",
    invalidStartScreen: "Start screen is missing or deleted.",
    duplicateScreenKey: (key: string) =>
      `Duplicate screen key: ${key}. Screen keys must be unique.`,
    missingScreenTitle: (index: number) =>
      `Screen #${index + 1} does not have a title.`,
    hotspotBounds: (label: string) =>
      `Hotspot “${label}” is out of screen bounds (allowed 0..100%).`,
    unknownTarget: (label: string) =>
      `Hotspot “${label}” points to a missing target screen.`,
    unreachableScreens: (count: number) =>
      `There are unreachable screens: ${count}. They cannot be reached from the start screen.`,
    deadEndScreen: (title: string) =>
      `Screen “${title}” is a dead-end (no outgoing transitions).`,
    noTransitions:
      "No screen transitions are configured. Learner flow cannot continue.",
    startWithoutOutgoing:
      "Start screen has no outgoing transitions. Add at least one hotspot transition.",
    noCompletionScreens:
      "No completion screen is configured. Mark at least one screen as completion.",
    unreachableCompletionScreens:
      "Completion screens are unreachable from the start screen.",
    completionWithOutgoing: (title: string) =>
      `Completion screen “${title}” has outgoing transitions.`,
  };
}

function parseSemver(version: string): [number, number, number] | null {
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
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

function withinRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function hasInvalidHotspotBounds(hotspot: {
  x: number;
  y: number;
  width: number;
  height: number;
}): boolean {
  return (
    !withinRange(hotspot.x, 0, 100) ||
    !withinRange(hotspot.y, 0, 100) ||
    !withinRange(hotspot.width, 1, 100) ||
    !withinRange(hotspot.height, 1, 100) ||
    hotspot.x + hotspot.width > 100 ||
    hotspot.y + hotspot.height > 100
  );
}

export function validateSimulationDraft(
  draft: SimulationDraft,
  language: AppLanguage,
): SimulationValidationResult {
  const messages = createMessageSet(language);
  const issues: SimulationIssue[] = [];
  const screens = draft.screens;
  if (!draft.targetApp.appName.trim()) {
    issues.push({
      id: "missing-app-name",
      severity: "error",
      message: messages.missingAppName,
    });
  }

  const minVersion = parseSemver(draft.targetApp.minSupportedVersion);
  const maxVersion = parseSemver(draft.targetApp.maxSupportedVersion);
  if (!minVersion || !maxVersion) {
    issues.push({
      id: "invalid-version-format",
      severity: "error",
      message: messages.invalidVersionFormat,
    });
  } else if (compareSemver(minVersion, maxVersion) > 0) {
    issues.push({
      id: "invalid-version-range",
      severity: "error",
      message: messages.invalidVersionRange,
    });
  }

  if (draft.targetApp.releasedAt.trim()) {
    const releaseAtValue = draft.targetApp.releasedAt.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseAtValue)) {
      issues.push({
        id: "invalid-released-at-format",
        severity: "error",
        message: messages.invalidReleasedAt,
      });
    } else {
      const date = new Date(`${releaseAtValue}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) {
        issues.push({
          id: "invalid-released-at-date",
          severity: "error",
          message: messages.invalidReleasedAt,
        });
      }
    }
  }

  if (screens.length === 0) {
    return {
      hasErrors: true,
      issues: [
        {
          id: "no-screens",
          severity: "error",
          message: messages.noScreens,
        },
      ],
    };
  }

  const completionScreens = screens.filter((screen) => screen.isCompletion);
  if (completionScreens.length === 0) {
    issues.push({
      id: "no-completion-screens",
      severity: "error",
      message: messages.noCompletionScreens,
    });
  }

  const screenIdSet = new Set(screens.map((screen) => screen.id));

  if (!draft.startScreenId || !screenIdSet.has(draft.startScreenId)) {
    issues.push({
      id: "invalid-start-screen",
      severity: "error",
      message: messages.invalidStartScreen,
    });
  }

  const normalizedKeyUsage = new Map<string, number>();
  screens.forEach((screen, index) => {
    const normalizedKey = toReleaseScreenKey(screen.key || screen.title, index);
    normalizedKeyUsage.set(
      normalizedKey,
      (normalizedKeyUsage.get(normalizedKey) ?? 0) + 1,
    );
  });

  normalizedKeyUsage.forEach((count, key) => {
    if (count > 1) {
      issues.push({
        id: `duplicate-key-${key}`,
        severity: "error",
        message: messages.duplicateScreenKey(key),
      });
    }
  });

  const adjacency = new Map<string, Set<string>>();
  let transitionsCount = 0;

  screens.forEach((screen, screenIndex) => {
    adjacency.set(screen.id, new Set<string>());

    if (!screen.title.trim()) {
      issues.push({
        id: `missing-title-${screen.id}`,
        severity: "error",
        message: messages.missingScreenTitle(screenIndex),
        screenId: screen.id,
      });
    }

    screen.hotspots.forEach((hotspot) => {
      const label = hotspot.label.trim() || hotspot.id;
      if (hasInvalidHotspotBounds(hotspot)) {
        issues.push({
          id: `hotspot-bounds-${hotspot.id}`,
          severity: "error",
          message: messages.hotspotBounds(label),
          screenId: screen.id,
          hotspotId: hotspot.id,
        });
      }

      if (hotspot.targetScreenId) {
        transitionsCount += 1;
        if (!screenIdSet.has(hotspot.targetScreenId)) {
          issues.push({
            id: `hotspot-target-${hotspot.id}`,
            severity: "error",
            message: messages.unknownTarget(label),
            screenId: screen.id,
            hotspotId: hotspot.id,
          });
        } else {
          adjacency.get(screen.id)?.add(hotspot.targetScreenId);
        }
      }
    });
  });

  const startScreen =
    draft.startScreenId && screenIdSet.has(draft.startScreenId)
      ? (screens.find((screen) => screen.id === draft.startScreenId) ?? null)
      : null;
  const startIsCompletion = Boolean(startScreen?.isCompletion);

  if (transitionsCount === 0 && !startIsCompletion) {
    issues.push({
      id: "no-transitions",
      severity: "error",
      message: messages.noTransitions,
    });
  }

  if (draft.startScreenId && screenIdSet.has(draft.startScreenId)) {
    const startOutgoing = adjacency.get(draft.startScreenId);
    if ((!startOutgoing || startOutgoing.size === 0) && !startIsCompletion) {
      issues.push({
        id: "start-without-outgoing",
        severity: "error",
        message: messages.startWithoutOutgoing,
        screenId: draft.startScreenId,
      });
    }

    const visited = new Set<string>();
    const queue: string[] = [draft.startScreenId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current)) {
        continue;
      }
      visited.add(current);

      adjacency.get(current)?.forEach((targetId) => {
        if (!visited.has(targetId)) {
          queue.push(targetId);
        }
      });
    }

    const unreachable = screens.filter((screen) => !visited.has(screen.id));
    if (unreachable.length > 0) {
      issues.push({
        id: "unreachable-screens",
        severity: "error",
        message: messages.unreachableScreens(unreachable.length),
      });
    }

    if (completionScreens.length > 0) {
      const reachableCompletion = completionScreens.some((screen) =>
        visited.has(screen.id),
      );
      if (!reachableCompletion) {
        issues.push({
          id: "unreachable-completion-screens",
          severity: "error",
          message: messages.unreachableCompletionScreens,
        });
      }
    }

    const deadEnds = screens.filter((screen) => {
      if (!visited.has(screen.id) || screen.isCompletion) {
        return false;
      }
      const targets = adjacency.get(screen.id);
      return !targets || targets.size === 0;
    });

    deadEnds.forEach((screen) => {
      issues.push({
        id: `dead-end-${screen.id}`,
        severity: "warning",
        message: messages.deadEndScreen(
          screen.title || screen.key || screen.id,
        ),
        screenId: screen.id,
      });
    });
  }

  completionScreens.forEach((screen) => {
    const targets = adjacency.get(screen.id);
    if (targets && targets.size > 0) {
      issues.push({
        id: `completion-with-outgoing-${screen.id}`,
        severity: "warning",
        message: messages.completionWithOutgoing(
          screen.title || screen.key || screen.id,
        ),
        screenId: screen.id,
      });
    }
  });

  const sorted = [...issues].sort((left, right) => {
    if (left.severity === right.severity) {
      return left.id.localeCompare(right.id);
    }
    return left.severity === "error" ? -1 : 1;
  });

  return {
    hasErrors: sorted.some((issue) => issue.severity === "error"),
    issues: sorted,
  };
}
