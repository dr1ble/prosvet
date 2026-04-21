import type {
  PreparedReleaseScreen,
  SimulationDraft,
  SimulationScreenDraft,
} from "./types";
import { toReleaseScreenKey } from "./keys";

function resolveScreenKeyMap(
  screens: SimulationScreenDraft[],
): Map<string, string> {
  const result = new Map<string, string>();
  screens.forEach((screen, index) => {
    result.set(
      screen.id,
      toReleaseScreenKey(screen.key || screen.title, index),
    );
  });
  return result;
}

function toNumber(value: number): number {
  return Number(value.toFixed(2));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function simulationDraftToReleaseScreens(
  draft: SimulationDraft,
): PreparedReleaseScreen[] {
  const keyMap = resolveScreenKeyMap(draft.screens);

  return draft.screens.map((screen, index) => ({
    screen_key: keyMap.get(screen.id) ?? `screen-${index + 1}`,
    title: screen.title.trim() || `Экран ${index + 1}`,
    order_index: index + 1,
    payload: {
      type: "simulation",
      image_url: screen.imageUrl.trim() || null,
      is_start: screen.id === draft.startScreenId,
      is_completion: screen.isCompletion,
      hotspots: screen.hotspots.map((hotspot) => ({
        label: hotspot.label.trim() || "Зона",
        hint: hotspot.hint.trim(),
        x: toNumber(clamp(hotspot.x, 0, 100)),
        y: toNumber(clamp(hotspot.y, 0, 100)),
        width: toNumber(clamp(hotspot.width, 1, 100)),
        height: toNumber(clamp(hotspot.height, 1, 100)),
        target_screen_key: hotspot.targetScreenId
          ? (keyMap.get(hotspot.targetScreenId) ?? null)
          : null,
      })),
    },
  }));
}
