export type SimulationDraftVersion = 1;

export type SimulationStoreType =
  | "play_market"
  | "rustore"
  | "app_store"
  | "other";

export interface SimulationTargetAppDraft {
  appName: string;
  packageName: string;
  storeType: SimulationStoreType;
  storeUrl: string;
  iconUrl: string;
  minSupportedVersion: string;
  maxSupportedVersion: string;
  releasedAt: string;
}

export interface SimulationHotspotDraft {
  id: string;
  label: string;
  hint: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetScreenId: string | null;
}

export interface SimulationScreenDraft {
  id: string;
  key: string;
  title: string;
  imageUrl: string;
  isCompletion: boolean;
  hotspots: SimulationHotspotDraft[];
}

export interface SimulationDraft {
  version: SimulationDraftVersion;
  title: string;
  targetApp: SimulationTargetAppDraft;
  startScreenId: string | null;
  screens: SimulationScreenDraft[];
  libraryItemId?: string | null;
  updatedAt: string;
}

export interface PreparedReleaseScreen {
  screen_key: string;
  title: string;
  order_index: number;
  payload: {
    type: "simulation";
    image_url: string | null;
    is_start: boolean;
    is_completion: boolean;
    hotspots: Array<{
      label: string;
      hint: string;
      x: number;
      y: number;
      width: number;
      height: number;
      target_screen_key: string | null;
    }>;
  };
}
