import { createInitialSimulationDraft } from "./factories";
import type { PreparedReleaseScreen, SimulationDraft } from "./types";
import { normalizeSimulationDraft } from "./validation";

const DRAFT_STORAGE_KEY_BASE = "wa_simulation_draft_v1";
const PREPARED_SCREENS_STORAGE_KEY_BASE = "wa_simulation_release_screens_v1";

function canUseStorage(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function sanitizeScope(scopeKey: string): string {
  const normalized = scopeKey.trim();
  if (!normalized) {
    return "global";
  }
  return normalized.replace(/[^a-zA-Z0-9:_|.-]/g, "_");
}

function draftStorageKey(scopeKey: string): string {
  return `${DRAFT_STORAGE_KEY_BASE}:${sanitizeScope(scopeKey)}`;
}

function preparedStorageKey(scopeKey: string): string {
  return `${PREPARED_SCREENS_STORAGE_KEY_BASE}:${sanitizeScope(scopeKey)}`;
}

export function loadSimulationDraft(scopeKey = "global"): SimulationDraft {
  if (!canUseStorage()) {
    return createInitialSimulationDraft();
  }

  const parsed = parseJson<unknown>(
    window.localStorage.getItem(draftStorageKey(scopeKey)),
  );
  const normalized = normalizeSimulationDraft(parsed);
  if (normalized) {
    return normalized;
  }

  return createInitialSimulationDraft();
}

export function saveSimulationDraft(
  draft: SimulationDraft,
  scopeKey = "global",
): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(draftStorageKey(scopeKey), JSON.stringify(draft));
}

export function clearSimulationDraft(scopeKey = "global"): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(draftStorageKey(scopeKey));
}

export function savePreparedReleaseScreens(
  screens: PreparedReleaseScreen[],
  scopeKey = "global",
): void {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(
    preparedStorageKey(scopeKey),
    JSON.stringify(screens),
  );
}

export function loadPreparedReleaseScreens(
  scopeKey = "global",
): PreparedReleaseScreen[] | null {
  if (!canUseStorage()) {
    return null;
  }

  const parsed = parseJson<unknown>(
    window.localStorage.getItem(preparedStorageKey(scopeKey)),
  );
  if (!Array.isArray(parsed)) {
    return null;
  }

  return parsed as PreparedReleaseScreen[];
}
