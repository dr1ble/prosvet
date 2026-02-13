import type { Edge } from "@xyflow/react";
import type {
  ScreenNodeData,
  HotspotData,
  ScreenNodeType,
} from "./canvas/ScreenNode";

export type { ScreenNodeData, HotspotData, ScreenNodeType };

export interface TransitionEdgeData extends Record<string, unknown> {
  label: string;
  hotspotId?: string;
}

export type TransitionEdge = Edge<TransitionEdgeData>;

export type SimulationNode = ScreenNodeType;
export type SimulationEdge = TransitionEdge;

export interface SimulationEditorState {
  nodes: SimulationNode[];
  edges: SimulationEdge[];
  selectedNodeId: string | null;
  selectedHotspotId: string | null;
  selectedEdgeId: string | null;
  mode: "select" | "draw";
}

export type EditorMode = "select" | "draw";

export interface HotspotDrawState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface AppScreen {
  id: string;
  key: string;
  title: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface App {
  id: string;
  packageName: string;
  appName: string;
  storeType: "play_market" | "rustore" | "app_store" | "other";
  storeUrl: string;
  iconUrl: string;
  minSupportedVersion: string;
  maxSupportedVersion: string;
  screens: AppScreen[];
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioScreen {
  id: string;
  appScreenId: string;
  x: number;
  y: number;
  hotspots: HotspotData[];
}

export interface Scenario {
  id: string;
  title: string;
  appId: string;
  startScreenId: string | null;
  screens: ScenarioScreen[];
  createdAt: string;
  updatedAt: string;
}
