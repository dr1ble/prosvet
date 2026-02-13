"use client";

import {
  useCallback,
  useState,
  useMemo,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  Panel,
  useViewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  ScreenNode,
  type ScreenNodeData,
  type HotspotData,
  type HotspotDrawHandler,
  type HotspotChangeHandler,
  type HotspotSelectHandler,
  type ScreenSelectHandler,
} from "./canvas/ScreenNode";
import type { SimulationNode, SimulationEdge } from "./types";
import { ToolsPanel } from "./panels/ToolsPanel";
import { ScreensTab } from "./panels/ScreensTab";
import {
  AppMediaTab,
  type AppMediaAsset,
  type AppMediaApplication,
  type AppMediaVersion,
} from "./panels/AppMediaTab";
import { LibraryTab } from "./panels/LibraryTab";
import type { AppScreen } from "./types";
import type { SimulationDraft } from "@/features/simulation/model/types";
import {
  deleteSimulationMediaAssetRemote,
  fetchCurrentSimulationDraftRemote,
  fetchSimulationMediaAppBindingsRemote,
  loadSimulationLibraryItemRemote,
  saveCurrentSimulationDraftRemote,
  saveSimulationLibraryItemRemote,
  fetchSimulationMediaAssetsRemote,
  renameSimulationMediaAssetRemote,
  resolveSimulationStoreAppRemote,
  type SimulationLibraryFilter,
  uploadSimulationMediaAssetRemote,
} from "@/features/simulation/api/client";
import {
  deriveAppNameFromPackageName,
  ensurePackageName,
} from "@/features/simulation/model/app-id";
import styles from "./SimulationEditor.module.css";

const nodeTypes = {
  screen: ScreenNode,
};

const defaultEdgeOptions = {
  type: "transition",
  animated: false,
  style: { stroke: "#3b82f6", strokeWidth: 2 },
};

const defaultTargetApp: SimulationDraft["targetApp"] = {
  appName: "",
  packageName: "app.custom.app",
  storeType: "other",
  storeUrl: "",
  iconUrl: "",
  minSupportedVersion: "1.0.0",
  maxSupportedVersion: "99.99.99",
  releasedAt: "",
};

const SCREEN_NODE_FALLBACK_WIDTH = 200;
const SCREEN_NODE_FALLBACK_HEIGHT = 390;
const HOTSPOT_DROP_HITBOX_SIZE = 24;
const HOTSPOT_LINK_DRAG_THRESHOLD_PX = 6;
const SCREEN_NODE_HEADER_HEIGHT = 34;
const SCENARIO_IMPORT_DEFAULT_X = 50;
const SCENARIO_IMPORT_DEFAULT_Y = 50;
const SCENARIO_IMPORT_VERTICAL_GAP = 88;
const SCENARIO_IMPORT_COLLISION_PADDING = 16;
const SCENARIO_IMPORT_COLLISION_STEP_Y = 56;
const SCENARIO_IMPORT_COLLISION_MAX_STEPS = 120;
const SIDEBAR_WIDTH_MIN = 220;
const SIDEBAR_WIDTH_DEFAULT = 220;
const SIDEBAR_WIDTH_MAX = 460;
const PROPERTIES_WIDTH_MIN = 240;
const PROPERTIES_WIDTH_DEFAULT = 260;
const PROPERTIES_WIDTH_MAX = 460;

const emptyModalTargetApp: SimulationDraft["targetApp"] = {
  appName: "",
  packageName: "",
  storeType: "other",
  storeUrl: "",
  iconUrl: "",
  minSupportedVersion: "",
  maxSupportedVersion: "",
  releasedAt: "",
};

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

function mapMediaAssetToAppScreen(asset: MediaAsset): AppScreen {
  const nameWithoutExt = asset.filename.replace(/\.[^/.]+$/, "");
  return {
    id: asset.id,
    key: nameWithoutExt,
    title: nameWithoutExt,
    imageUrl: asset.url,
    createdAt: asset.uploadedAt,
    updatedAt: asset.uploadedAt,
  };
}

function splitFilename(filename: string): { base: string; extension: string } {
  const match = filename.match(/^(.*?)(\.[^.]*)?$/);
  const base = match?.[1]?.trim() ?? filename.trim();
  const extension = match?.[2] ?? "";
  return { base, extension };
}

function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, width));
}

function clampPropertiesWidth(width: number): number {
  return Math.min(PROPERTIES_WIDTH_MAX, Math.max(PROPERTIES_WIDTH_MIN, width));
}

function findNodeIdAtPoint(
  clientX: number,
  clientY: number,
  sourceNodeId: string,
): string | null {
  const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
  for (const element of elementsAtPoint) {
    const nodeElement = element.closest<HTMLElement>(
      ".react-flow__node[data-id]",
    );
    const nodeId = nodeElement?.dataset.id;
    if (nodeId && nodeId !== sourceNodeId) {
      return nodeId;
    }
  }

  const hitPadding = 8;
  const nodeElements = Array.from(
    document.querySelectorAll<HTMLElement>(".react-flow__node[data-id]"),
  );
  const hit = nodeElements.find((element) => {
    const nodeId = element.dataset.id;
    if (!nodeId || nodeId === sourceNodeId) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return (
      clientX >= rect.left - hitPadding &&
      clientX <= rect.right + hitPadding &&
      clientY >= rect.top - hitPadding &&
      clientY <= rect.bottom + hitPadding
    );
  });
  return hit?.dataset.id ?? null;
}

function findNodeIdAtFlowPoint(
  point: { x: number; y: number },
  sourceNodeId: string,
  nodes: SimulationNode[],
): string | null {
  let matchedNodeId: string | null = null;
  let matchedArea = Number.POSITIVE_INFINITY;

  for (const node of nodes) {
    if (node.id === sourceNodeId) {
      continue;
    }

    const width =
      node.width ?? node.measured?.width ?? SCREEN_NODE_FALLBACK_WIDTH;
    const height =
      node.height ?? node.measured?.height ?? SCREEN_NODE_FALLBACK_HEIGHT;

    const withinX =
      point.x >= node.position.x && point.x <= node.position.x + width;
    const withinY =
      point.y >= node.position.y && point.y <= node.position.y + height;

    if (!withinX || !withinY) {
      continue;
    }

    const area = width * height;
    if (area < matchedArea) {
      matchedArea = area;
      matchedNodeId = node.id;
    }
  }

  return matchedNodeId;
}

function findClosestTargetNodeId(
  candidates: SimulationNode[],
  point: { x: number; y: number },
  sourceNodeId: string,
): string | null {
  let matchedNodeId: string | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const node of candidates) {
    if (node.id === sourceNodeId) {
      continue;
    }
    const width =
      node.width ?? node.measured?.width ?? SCREEN_NODE_FALLBACK_WIDTH;
    const height =
      node.height ?? node.measured?.height ?? SCREEN_NODE_FALLBACK_HEIGHT;
    const centerX = node.position.x + width / 2;
    const centerY = node.position.y + height / 2;
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    const distance = dx * dx + dy * dy;
    if (distance < closestDistance) {
      closestDistance = distance;
      matchedNodeId = node.id;
    }
  }

  return matchedNodeId;
}

type ConnectionSide = "left" | "right" | "top" | "bottom";

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function offsetPointBySide(
  point: { x: number; y: number },
  side: ConnectionSide,
  offset: number,
): { x: number; y: number } {
  switch (side) {
    case "left":
      return { x: point.x - offset, y: point.y };
    case "right":
      return { x: point.x + offset, y: point.y };
    case "top":
      return { x: point.x, y: point.y - offset };
    case "bottom":
      return { x: point.x, y: point.y + offset };
    default:
      return point;
  }
}

function resolveSourceConnectionSide(
  fromPoint: { x: number; y: number },
  toPoint: { x: number; y: number },
): ConnectionSide {
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }
  return dy >= 0 ? "bottom" : "top";
}

function isHorizontalSide(side: ConnectionSide): boolean {
  return side === "left" || side === "right";
}

function computeBezierHandleOffset(
  fullDistance: number,
  axisDistance: number,
): number {
  const distanceDriven = fullDistance * 0.45;
  const axisDriven = axisDistance * 0.75;
  return clampValue(Math.max(distanceDriven, axisDriven), 72, 300);
}

function buildCurvedConnectionPath(
  fromPoint: { x: number; y: number },
  toPoint: { x: number; y: number },
  targetSide: ConnectionSide,
): string {
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const sourceSide = resolveSourceConnectionSide(fromPoint, toPoint);
  const sourceAxisDistance = isHorizontalSide(sourceSide)
    ? Math.abs(dx)
    : Math.abs(dy);
  const targetAxisDistance = isHorizontalSide(targetSide)
    ? Math.abs(dx)
    : Math.abs(dy);
  const sourceOffset = computeBezierHandleOffset(distance, sourceAxisDistance);
  const targetOffset = computeBezierHandleOffset(distance, targetAxisDistance);
  const sourceControl = offsetPointBySide(fromPoint, sourceSide, sourceOffset);
  const targetControl = offsetPointBySide(toPoint, targetSide, targetOffset);

  return `M ${fromPoint.x} ${fromPoint.y} C ${sourceControl.x} ${sourceControl.y} ${targetControl.x} ${targetControl.y} ${toPoint.x} ${toPoint.y}`;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tagName = target.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    return true;
  }
  return (
    target.closest("input, textarea, select, [contenteditable='true']") !== null
  );
}

function buildDragPreviewPath(
  fromPoint: { x: number; y: number },
  toPoint: { x: number; y: number },
): string {
  const targetSide = resolveSourceConnectionSide(toPoint, fromPoint);
  return buildCurvedConnectionPath(fromPoint, toPoint, targetSide);
}

function resolveNearestTargetAnchor(
  sourcePoint: { x: number; y: number },
  targetRect: { x: number; y: number; width: number; height: number },
): { side: ConnectionSide; point: { x: number; y: number } } {
  const anchors = [
    {
      side: "left" as const,
      point: { x: targetRect.x, y: targetRect.y + targetRect.height / 2 },
    },
    {
      side: "right" as const,
      point: {
        x: targetRect.x + targetRect.width,
        y: targetRect.y + targetRect.height / 2,
      },
    },
    {
      side: "top" as const,
      point: { x: targetRect.x + targetRect.width / 2, y: targetRect.y },
    },
    {
      side: "bottom" as const,
      point: {
        x: targetRect.x + targetRect.width / 2,
        y: targetRect.y + targetRect.height,
      },
    },
  ];

  let nearestAnchor = anchors[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const anchor of anchors) {
    const dx = sourcePoint.x - anchor.point.x;
    const dy = sourcePoint.y - anchor.point.y;
    const distance = dx * dx + dy * dy;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestAnchor = anchor;
    }
  }

  return nearestAnchor;
}

type MediaAsset = AppMediaAsset;

function buildAppVersionKey(input: {
  appPackageName: string;
  storeType: string;
  minSupportedVersion: string;
  maxSupportedVersion: string;
  releasedAt: string | null;
}): string {
  return [
    input.appPackageName,
    input.storeType,
    input.minSupportedVersion,
    input.maxSupportedVersion,
    input.releasedAt ?? "",
  ].join("|");
}

type SimulationEditorProps = {
  language: "ru" | "en";
  scopeKey: string;
  scopeLabel: string;
};

type ScenarioInsertOptions = {
  dropFlowPosition?: { x: number; y: number } | null;
};

type EditorHistorySnapshot = {
  nodes: SimulationNode[];
  edges: SimulationEdge[];
};

function cloneEditorHistorySnapshot(
  snapshot: EditorHistorySnapshot,
): EditorHistorySnapshot {
  return structuredClone(snapshot);
}

function buildEditorHistorySignature(snapshot: EditorHistorySnapshot): string {
  return JSON.stringify({
    nodes: snapshot.nodes,
    edges: snapshot.edges,
  });
}

function draftToNodesEdges(draft: SimulationDraft): {
  nodes: SimulationNode[];
  edges: SimulationEdge[];
} {
  const nodes: SimulationNode[] = draft.screens.map((screen, index) => ({
    id: screen.id,
    type: "screen",
    position: {
      x: 50 + (index % 4) * 250,
      y: 50 + Math.floor(index / 4) * 400,
    },
    data: {
      key: screen.key,
      title: screen.title,
      imageUrl: screen.imageUrl,
      isCompletion: screen.isCompletion,
      isStart: screen.id === draft.startScreenId,
      hotspots: screen.hotspots.map((h) => ({
        id: h.id,
        label: h.label,
        hint: h.hint,
        x: h.x,
        y: h.y,
        width: h.width,
        height: h.height,
        targetScreenId: h.targetScreenId,
      })),
    },
  }));

  const edges: SimulationEdge[] = [];
  draft.screens.forEach((screen) => {
    screen.hotspots.forEach((hotspot, index) => {
      if (hotspot.targetScreenId) {
        edges.push({
          id: `edge-${screen.id}-${hotspot.targetScreenId}-${index}`,
          source: screen.id,
          target: hotspot.targetScreenId,
          type: "transition",
          data: {
            label: hotspot.label,
            hotspotId: hotspot.id,
          },
        });
      }
    });
  });

  return { nodes, edges };
}

function nodesEdgesToDraft(
  nodes: SimulationNode[],
  title: string,
  targetApp: SimulationDraft["targetApp"],
): SimulationDraft {
  const screens = nodes.map((node) => ({
    id: node.id,
    key: node.data.key,
    title: node.data.title,
    imageUrl: node.data.imageUrl,
    isCompletion: node.data.isCompletion,
    hotspots: node.data.hotspots.map((h) => ({
      id: h.id,
      label: h.label,
      hint: h.hint,
      x: h.x,
      y: h.y,
      width: h.width,
      height: h.height,
      targetScreenId: h.targetScreenId,
    })),
  }));

  const startNode = nodes.find((n) => n.data.isStart);
  const startScreenId = startNode?.id || nodes[0]?.id || null;

  return {
    version: 1,
    title,
    targetApp,
    startScreenId,
    screens,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeComparable(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function buildUniqueValue(
  source: string,
  used: Set<string>,
  fallbackPrefix: string,
): string {
  const base = source.trim() || fallbackPrefix;
  const normalizedBase = normalizeComparable(base);
  if (!used.has(normalizedBase)) {
    used.add(normalizedBase);
    return base;
  }
  let index = 2;
  while (index < 10000) {
    const candidate = `${base} (${index})`;
    const normalizedCandidate = normalizeComparable(candidate);
    if (!used.has(normalizedCandidate)) {
      used.add(normalizedCandidate);
      return candidate;
    }
    index += 1;
  }
  const forced = `${base} (${Date.now()})`;
  used.add(normalizeComparable(forced));
  return forced;
}

function withStartAndCompletionFlags(
  nodes: SimulationNode[],
): SimulationNode[] {
  if (nodes.length === 0) {
    return nodes;
  }
  const sorted = [...nodes].sort(
    (a, b) => a.position.x - b.position.x || a.position.y - b.position.y,
  );
  const firstId = sorted[0]?.id;
  const lastId = sorted[sorted.length - 1]?.id;
  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      isStart: node.id === firstId,
      isCompletion: nodes.length > 1 && node.id === lastId,
    },
  }));
}

function getNodeWidth(node: SimulationNode): number {
  return node.width ?? node.measured?.width ?? SCREEN_NODE_FALLBACK_WIDTH;
}

function getNodeHeight(node: SimulationNode): number {
  return node.height ?? node.measured?.height ?? SCREEN_NODE_FALLBACK_HEIGHT;
}

function getNodeBounds(node: SimulationNode): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  const width = getNodeWidth(node);
  const height = getNodeHeight(node);
  return {
    left: node.position.x,
    top: node.position.y,
    right: node.position.x + width,
    bottom: node.position.y + height,
  };
}

function rectanglesOverlap(
  left: { left: number; top: number; right: number; bottom: number },
  right: { left: number; top: number; right: number; bottom: number },
  padding: number,
): boolean {
  return !(
    left.right + padding <= right.left ||
    left.left >= right.right + padding ||
    left.bottom + padding <= right.top ||
    left.top >= right.bottom + padding
  );
}

function buildSelectedScreensDraft(
  fullDraft: SimulationDraft,
  selectedScreenIds: string[],
): SimulationDraft | null {
  if (selectedScreenIds.length === 0) {
    return null;
  }
  const selectedIdSet = new Set(selectedScreenIds);
  const selectedScreens = fullDraft.screens.filter((screen) =>
    selectedIdSet.has(screen.id),
  );
  if (selectedScreens.length === 0) {
    return null;
  }

  const filteredScreenIds = new Set(selectedScreens.map((screen) => screen.id));
  const screens = selectedScreens.map((screen) => ({
    ...screen,
    hotspots: screen.hotspots.map((hotspot) => ({
      ...hotspot,
      targetScreenId:
        hotspot.targetScreenId && filteredScreenIds.has(hotspot.targetScreenId)
          ? hotspot.targetScreenId
          : null,
    })),
  }));

  const startScreenId =
    fullDraft.startScreenId && filteredScreenIds.has(fullDraft.startScreenId)
      ? fullDraft.startScreenId
      : (screens[0]?.id ?? null);

  return {
    ...fullDraft,
    screens,
    startScreenId,
    updatedAt: new Date().toISOString(),
  };
}

function SimulationEditorInner({
  language,
  scopeLabel,
  scopeKey,
}: SimulationEditorProps) {
  const [nodes, setNodes] = useState<SimulationNode[]>([]);
  const [edges, setEdges] = useState<SimulationEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(
    null,
  );
  const [showAllConnections, setShowAllConnections] = useState(false);
  const [draggingHotspot, setDraggingHotspot] = useState<{
    hotspotId: string;
    sourceNodeId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [dropHint, setDropHint] = useState<{
    message: string;
    x: number;
    y: number;
  } | null>(null);
  const [targetApp, setTargetApp] =
    useState<SimulationDraft["targetApp"]>(defaultTargetApp);
  const [applications, setApplications] = useState<AppMediaApplication[]>([]);
  const [loadedVersionScreens, setLoadedVersionScreens] = useState<
    Record<string, boolean>
  >({});
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [appSearchQuery, setAppSearchQuery] = useState("");
  const [appsReloadToken, setAppsReloadToken] = useState(0);
  const [appScreens, setAppScreens] = useState<AppScreen[]>([]);
  const [isAddMediaModalOpen, setIsAddMediaModalOpen] = useState(false);
  const [addMediaModalMode, setAddMediaModalMode] = useState<"create" | "edit">(
    "create",
  );
  const [modalTargetApp, setModalTargetApp] =
    useState<SimulationDraft["targetApp"]>(defaultTargetApp);
  const [modalMediaAssets, setModalMediaAssets] = useState<MediaAsset[]>([]);
  const [modalMediaSearchQuery, setModalMediaSearchQuery] = useState("");
  const [modalMediaLoading, setModalMediaLoading] = useState(false);
  const [modalMediaUploading, setModalMediaUploading] = useState(false);
  const [modalMediaError, setModalMediaError] = useState<string | null>(null);
  const [modalResolvingStoreApp, setModalResolvingStoreApp] = useState(false);
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_WIDTH_DEFAULT);
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const [propertiesWidth, setPropertiesWidth] = useState(
    PROPERTIES_WIDTH_DEFAULT,
  );
  const [isPropertiesResizing, setIsPropertiesResizing] = useState(false);
  const [canvasLayoutTick, setCanvasLayoutTick] = useState(0);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const {
    fitView,
    screenToFlowPosition,
    flowToScreenPosition,
    getIntersectingNodes,
  } = useReactFlow<SimulationNode, SimulationEdge>();
  const viewport = useViewport();

  const draggingHotspotRef = useRef(draggingHotspot);
  draggingHotspotRef.current = draggingHotspot;

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  const languageRef = useRef(language);
  languageRef.current = language;

  const screenToFlowPositionRef = useRef(screenToFlowPosition);
  screenToFlowPositionRef.current = screenToFlowPosition;

  const getIntersectingNodesRef = useRef(getIntersectingNodes);
  getIntersectingNodesRef.current = getIntersectingNodes;

  const historyPastRef = useRef<EditorHistorySnapshot[]>([]);
  const historyFutureRef = useRef<EditorHistorySnapshot[]>([]);
  const historyLastSignatureRef = useRef<string | null>(null);
  const historyLastSnapshotRef = useRef<EditorHistorySnapshot | null>(null);
  const isApplyingHistoryRef = useRef(false);
  const sidebarResizeRef = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
  } | null>(null);
  const propertiesResizeRef = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const getDraftForLibrarySave = useCallback(
    (mode: "all" | "selected"): SimulationDraft | null => {
      const fullDraft = nodesEdgesToDraft(nodes, title, targetApp);
      if (mode === "all") {
        return fullDraft;
      }

      const selectedNodeIds = nodes
        .filter((node) => node.selected)
        .map((node) => node.id);
      const fallbackSelectedIds =
        selectedNodeIds.length === 0 && selectedNodeId ? [selectedNodeId] : [];
      const effectiveSelectedIds =
        selectedNodeIds.length > 0 ? selectedNodeIds : fallbackSelectedIds;

      return buildSelectedScreensDraft(fullDraft, effectiveSelectedIds);
    },
    [nodes, selectedNodeId, targetApp, title],
  );

  const insertScenarioDraft = useCallback(
    (draft: SimulationDraft, options?: ScenarioInsertOptions): boolean => {
      const imported = draftToNodesEdges(draft);
      if (imported.nodes.length === 0) {
        return false;
      }

      const existingNodes = nodesRef.current;
      const existingEdges = edgesRef.current;

      const importedMinX = Math.min(
        ...imported.nodes.map((node) => node.position.x),
      );
      const importedMinY = Math.min(
        ...imported.nodes.map((node) => node.position.y),
      );

      const desiredAnchor = (() => {
        if (options?.dropFlowPosition) {
          return options.dropFlowPosition;
        }
        if (existingNodes.length === 0) {
          return { x: SCENARIO_IMPORT_DEFAULT_X, y: SCENARIO_IMPORT_DEFAULT_Y };
        }
        const minLeft = Math.min(
          ...existingNodes.map((node) => node.position.x),
        );
        const maxBottom = Math.max(
          ...existingNodes.map((node) => node.position.y + getNodeHeight(node)),
        );
        return {
          x: Number.isFinite(minLeft) ? minLeft : SCENARIO_IMPORT_DEFAULT_X,
          y: maxBottom + SCENARIO_IMPORT_VERTICAL_GAP,
        };
      })();

      const baseOffset = {
        x: desiredAnchor.x - importedMinX,
        y: desiredAnchor.y - importedMinY,
      };

      const usedTitles = new Set(
        existingNodes.map((node) => normalizeComparable(node.data.title || "")),
      );
      const usedKeys = new Set(
        existingNodes.map((node) => normalizeComparable(node.data.key || "")),
      );

      const screenIdMap = new Map<string, string>();
      const hotspotIdMap = new Map<string, string>();
      imported.nodes.forEach((node, index) => {
        screenIdMap.set(
          node.id,
          `screen-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        );
        node.data.hotspots.forEach((hotspot, hotspotIndex) => {
          hotspotIdMap.set(
            hotspot.id,
            `hotspot-${Date.now()}-${index}-${hotspotIndex}-${Math.random().toString(36).slice(2, 8)}`,
          );
        });
      });

      const baseNodes: SimulationNode[] = imported.nodes.map((node) => {
        const mappedId = screenIdMap.get(node.id) ?? node.id;
        const nextTitle = buildUniqueValue(
          node.data.title,
          usedTitles,
          language === "ru" ? "Экран" : "Screen",
        );
        const nextKey = buildUniqueValue(node.data.key, usedKeys, "screen");

        return {
          ...node,
          id: mappedId,
          position: {
            x: node.position.x + baseOffset.x,
            y: node.position.y + baseOffset.y,
          },
          data: {
            ...node.data,
            title: nextTitle,
            key: nextKey,
            hotspots: node.data.hotspots.map((hotspot) => ({
              ...hotspot,
              id: hotspotIdMap.get(hotspot.id) ?? hotspot.id,
              targetScreenId: hotspot.targetScreenId
                ? (screenIdMap.get(hotspot.targetScreenId) ?? null)
                : null,
            })),
          },
        };
      });

      const importedEdges: SimulationEdge[] = imported.edges
        .map((edge, index) => {
          const source = screenIdMap.get(edge.source);
          const target = screenIdMap.get(edge.target);
          if (!source || !target) {
            return null;
          }
          const mappedHotspotId =
            typeof edge.data?.hotspotId === "string"
              ? (hotspotIdMap.get(edge.data.hotspotId) ?? edge.data.hotspotId)
              : undefined;

          return {
            ...edge,
            id: `edge-${source}-${target}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
            source,
            target,
            data: {
              ...(edge.data ?? { label: "" }),
              hotspotId: mappedHotspotId,
            },
          } as SimulationEdge;
        })
        .filter((edge): edge is SimulationEdge => edge !== null);

      let resolvedNodes = baseNodes;
      for (
        let step = 0;
        step < SCENARIO_IMPORT_COLLISION_MAX_STEPS;
        step += 1
      ) {
        const hasCollision = resolvedNodes.some((candidateNode) => {
          const candidateBounds = getNodeBounds(candidateNode);
          return existingNodes.some((existingNode) =>
            rectanglesOverlap(
              candidateBounds,
              getNodeBounds(existingNode),
              SCENARIO_IMPORT_COLLISION_PADDING,
            ),
          );
        });
        if (!hasCollision) {
          break;
        }
        resolvedNodes = resolvedNodes.map((node) => ({
          ...node,
          position: {
            ...node.position,
            y: node.position.y + SCENARIO_IMPORT_COLLISION_STEP_Y,
          },
        }));
      }

      const mergedNodes = withStartAndCompletionFlags([
        ...existingNodes,
        ...resolvedNodes,
      ]);
      setNodes(mergedNodes);
      setEdges([...existingEdges, ...importedEdges]);
      setSelectedNodeId(resolvedNodes[0]?.id ?? null);
      setSelectedEdgeId(null);
      setSelectedHotspotId(null);
      return true;
    },
    [language],
  );

  const handleInsertLibraryItem = useCallback(
    async (
      itemId: string,
      options?: ScenarioInsertOptions,
    ): Promise<boolean> => {
      try {
        const loaded = await loadSimulationLibraryItemRemote(itemId);
        if (!loaded) {
          return false;
        }
        return insertScenarioDraft(loaded, options);
      } catch (error) {
        console.error("Failed to insert scenario from library:", error);
        return false;
      }
    },
    [insertScenarioDraft],
  );

  const handleSaveLibraryScenario = useCallback(
    async (
      mode: "all" | "selected",
    ): Promise<{ ok: boolean; message?: string }> => {
      const draft = getDraftForLibrarySave(mode);
      if (!draft) {
        return {
          ok: false,
          message:
            language === "ru"
              ? "Выберите хотя бы один экран для сохранения."
              : "Select at least one screen to save.",
        };
      }

      try {
        await saveSimulationLibraryItemRemote(scopeKey, {
          title:
            draft.title.trim() || (language === "ru" ? "Сценарий" : "Scenario"),
          draft,
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : language === "ru"
                ? "Не удалось сохранить сценарий."
                : "Failed to save scenario.",
        };
      }
    },
    [getDraftForLibrarySave, language, scopeKey],
  );

  const libraryBindingFilter = useMemo<SimulationLibraryFilter | null>(() => {
    const packageName = targetApp.packageName.trim();
    const minSupportedVersion = targetApp.minSupportedVersion.trim();
    const maxSupportedVersion = targetApp.maxSupportedVersion.trim();
    if (!packageName || !minSupportedVersion || !maxSupportedVersion) {
      return null;
    }
    const isDefaultBinding =
      packageName === defaultTargetApp.packageName && !targetApp.appName.trim();
    if (isDefaultBinding) {
      return null;
    }
    return {
      appPackageName: packageName,
      storeType: targetApp.storeType,
      minSupportedVersion,
      maxSupportedVersion,
      releasedAt: targetApp.releasedAt.trim(),
    };
  }, [
    targetApp.appName,
    targetApp.maxSupportedVersion,
    targetApp.minSupportedVersion,
    targetApp.packageName,
    targetApp.releasedAt,
    targetApp.storeType,
  ]);

  useEffect(() => {
    let mounted = true;
    async function loadDraft() {
      try {
        const draft = await fetchCurrentSimulationDraftRemote(scopeKey);
        if (!mounted) return;
        if (draft) {
          setTitle(draft.title);
          setTargetApp(draft.targetApp ?? defaultTargetApp);
          const { nodes: loadedNodes, edges: loadedEdges } =
            draftToNodesEdges(draft);
          setNodes(loadedNodes);
          setEdges(loadedEdges);
          setTimeout(() => fitView({ padding: 0.2 }), 50);
        }
      } catch (error) {
        console.error("Failed to load draft:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadDraft();
    return () => {
      mounted = false;
    };
  }, [scopeKey, fitView]);

  const modalMediaBinding = useMemo(
    () => ({
      appPackageName: ensurePackageName(
        modalTargetApp.packageName,
        modalTargetApp.appName,
      ),
      storeType: modalTargetApp.storeType,
      minSupportedVersion: modalTargetApp.minSupportedVersion.trim() || "1.0.0",
      maxSupportedVersion:
        modalTargetApp.maxSupportedVersion.trim() || "99.99.99",
      releasedAt: modalTargetApp.releasedAt.trim(),
    }),
    [modalTargetApp],
  );

  const modalMediaBindingError = useMemo(() => {
    if (!modalTargetApp.appName.trim()) {
      return language === "ru"
        ? "Укажите название приложения, чтобы открыть медиатеку."
        : "Set app name to unlock media library.";
    }
    const minRaw = modalTargetApp.minSupportedVersion.trim();
    const maxRaw = modalTargetApp.maxSupportedVersion.trim();
    const min = parseSemver(minRaw || "1.0.0");
    const max = parseSemver(maxRaw || "99.99.99");
    const minFormatInvalid = minRaw.length > 0 && !parseSemver(minRaw);
    const maxFormatInvalid = maxRaw.length > 0 && !parseSemver(maxRaw);
    if (minFormatInvalid || maxFormatInvalid || !min || !max) {
      return language === "ru"
        ? "Проверьте формат версий (X.Y.Z)."
        : "Check version format (X.Y.Z).";
    }
    if (compareSemver(min, max) > 0) {
      return language === "ru"
        ? "Мин. версия не может быть больше макс. версии."
        : "Min version cannot be greater than max version.";
    }
    if (!isValidReleaseDate(modalMediaBinding.releasedAt)) {
      return language === "ru"
        ? "Дата релиза должна быть в формате YYYY-MM-DD."
        : "Release date must use YYYY-MM-DD format.";
    }
    return null;
  }, [
    language,
    modalMediaBinding.releasedAt,
    modalTargetApp.appName,
    modalTargetApp.maxSupportedVersion,
    modalTargetApp.minSupportedVersion,
  ]);

  useEffect(() => {
    let mounted = true;
    async function loadApps() {
      setAppsLoading(true);
      setAppsError(null);
      try {
        const items = await fetchSimulationMediaAppBindingsRemote(
          scopeKey,
          appSearchQuery,
        );
        if (!mounted) return;
        setApplications((prev) => {
          const prevByKey = new Map(prev.map((app) => [app.key, app]));
          const grouped = new Map<string, AppMediaApplication>();

          items.forEach((item) => {
            const appKey = item.appPackageName;
            const prevApp = prevByKey.get(appKey);
            const app =
              grouped.get(appKey) ??
              ({
                key: appKey,
                appName: prevApp?.appName
                  ? prevApp.appName
                  : deriveAppNameFromPackageName(
                      item.appPackageName,
                      item.appPackageName,
                    ),
                iconUrl: prevApp?.iconUrl ?? null,
                expanded: prevApp?.expanded ?? false,
                versions: [],
              } satisfies AppMediaApplication);

            const versionKey = buildAppVersionKey({
              appPackageName: item.appPackageName,
              storeType: item.storeType,
              minSupportedVersion: item.minSupportedVersion,
              maxSupportedVersion: item.maxSupportedVersion,
              releasedAt: item.releasedAt,
            });
            const prevVersion = prevApp?.versions.find(
              (version) => version.key === versionKey,
            );
            app.versions.push({
              key: versionKey,
              storeType: item.storeType,
              minSupportedVersion: item.minSupportedVersion,
              maxSupportedVersion: item.maxSupportedVersion,
              releasedAt: item.releasedAt,
              assetsCount: item.assetsCount,
              expanded: prevVersion?.expanded ?? false,
              screensLoading: prevVersion?.screensLoading ?? false,
              screensError: prevVersion?.screensError ?? null,
              screens: prevVersion?.screens ?? [],
            } satisfies AppMediaVersion);

            grouped.set(appKey, app);
          });

          return Array.from(grouped.values()).sort((left, right) =>
            left.appName.localeCompare(right.appName, "ru"),
          );
        });
      } catch (error) {
        if (!mounted) return;
        setAppsError(
          error instanceof Error
            ? error.message
            : language === "ru"
              ? "Не удалось загрузить список приложений."
              : "Failed to load applications.",
        );
      } finally {
        if (mounted) {
          setAppsLoading(false);
        }
      }
    }
    loadApps();
    return () => {
      mounted = false;
    };
  }, [appSearchQuery, appsReloadToken, language, scopeKey]);

  useEffect(() => {
    if (!isAddMediaModalOpen) {
      return;
    }
    let mounted = true;
    async function loadModalMedia() {
      if (modalMediaBindingError) {
        setModalMediaAssets([]);
        setModalMediaError(null);
        return;
      }

      setModalMediaLoading(true);
      setModalMediaError(null);
      try {
        const assets = await fetchSimulationMediaAssetsRemote(
          scopeKey,
          modalMediaSearchQuery,
          modalMediaBinding,
        );
        if (!mounted) return;
        const mapped: MediaAsset[] = assets.map((a) => ({
          id: a.id,
          filename: a.originalFilename,
          url: a.fileUrl,
          uploadedAt: a.createdAt,
        }));
        setModalMediaAssets(mapped);
      } catch (error) {
        if (!mounted) return;
        setModalMediaError(
          error instanceof Error
            ? error.message
            : language === "ru"
              ? "Не удалось загрузить медиатеку."
              : "Failed to load media library.",
        );
      } finally {
        if (mounted) {
          setModalMediaLoading(false);
        }
      }
    }
    loadModalMedia();
    return () => {
      mounted = false;
    };
  }, [
    isAddMediaModalOpen,
    language,
    modalMediaBinding,
    modalMediaBindingError,
    modalMediaSearchQuery,
    scopeKey,
  ]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const draft = nodesEdgesToDraft(nodes, title, targetApp);
      const saved = await saveCurrentSimulationDraftRemote(draft, scopeKey);
      if (saved) {
        setTargetApp(saved.targetApp ?? defaultTargetApp);
        setLastSavedAt(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error("Failed to save draft:", error);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, title, targetApp, scopeKey, isSaving]);

  const handleExport = useCallback(() => {
    const draft = nodesEdgesToDraft(nodes, title, targetApp);
    const json = JSON.stringify(draft, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "simulation"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, title, targetApp]);

  const onNodesChange: OnNodesChange<SimulationNode> = useCallback(
    (changes) => {
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds) as SimulationNode[];
        const hasPositionChange = changes.some(
          (c) => c.type === "position" && c.dragging === false,
        );
        if (hasPositionChange && updated.length > 0) {
          return withStartAndCompletionFlags(updated);
        }
        return updated;
      });
    },
    [],
  );

  const onEdgesChange: OnEdgesChange<SimulationEdge> = useCallback(
    (changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds) as SimulationEdge[]);
    },
    [],
  );

  const labels = useMemo(
    () =>
      language === "ru"
        ? {
            title: "Конструктор симуляций",
            addScreen: "Добавить экран",
            save: "Сохранить",
            preview: "Превью",
            export: "Экспорт",
            propertiesTitle: "Свойства",
            propertiesHint: "Выберите экран или зону для редактирования",
            scenarioTitle: "Название сценария",
            scenarioPlaceholder: "Введите название...",
            screenTitle: "Название экрана",
            screenImage: "Изображение",
            removeImage: "Удалить",
            startScreen: "Начальный экран",
            endScreen: "Финальный экран",
            hotspotsTitle: "Зоны перехода",
            noHotspots: "Перетащите по экрану, чтобы создать зону",
            hotspotLabel: "Название",
            hotspotHint: "Подсказка",
            hotspotTarget: "Целевой экран",
            noTarget: "-- Не выбрано --",
            deleteHotspot: "Удалить зону",
            deleteScreen: "Удалить экран",
            backToMenu: "Назад",
            showAllConnections: "Показать все связи",
            showOnlySelectedConnections: "Показывать только выбранную зону",
            resizeSidebar: "Изменить ширину левого меню",
            resizeProperties: "Изменить ширину панели свойств",
            closePreview: "Закрыть предпросмотр",
            imagePreviewHint: "Двойной клик для предпросмотра",
          }
        : {
            title: "Simulation Editor",
            addScreen: "Add screen",
            save: "Save",
            preview: "Preview",
            export: "Export",
            propertiesTitle: "Properties",
            propertiesHint: "Select a screen or hotspot to edit",
            scenarioTitle: "Scenario title",
            scenarioPlaceholder: "Enter title...",
            screenTitle: "Screen title",
            screenImage: "Image",
            removeImage: "Remove",
            startScreen: "Start screen",
            endScreen: "End screen",
            hotspotsTitle: "Hotspots",
            noHotspots: "Drag over screen image to create hotspot",
            hotspotLabel: "Label",
            hotspotHint: "Hint",
            hotspotTarget: "Target screen",
            noTarget: "-- None --",
            deleteHotspot: "Delete hotspot",
            deleteScreen: "Delete screen",
            backToMenu: "Back",
            showAllConnections: "Show all links",
            showOnlySelectedConnections: "Show selected hotspot only",
            resizeSidebar: "Resize left panel",
            resizeProperties: "Resize properties panel",
            closePreview: "Close preview",
            imagePreviewHint: "Double click to preview",
          },
    [language],
  );

  const handleAddScreen = useCallback(() => {
    const newId = `screen-${Date.now()}`;
    const newKey = `screen_${nodes.length + 1}`;

    const newNode: SimulationNode = {
      id: newId,
      type: "screen",
      position: {
        x: 50 + (nodes.length % 4) * 250,
        y: 50 + Math.floor(nodes.length / 4) * 400,
      },
      data: {
        key: newKey,
        title: "",
        imageUrl: "",
        isCompletion: false,
        isStart: false,
        hotspots: [],
      },
    };

    const updatedNodes = [...nodes, newNode];
    const finalNodes = withStartAndCompletionFlags(updatedNodes);

    setNodes(finalNodes);
    setSelectedNodeId(newId);
    setSelectedHotspotId(null);
  }, [nodes]);

  const handleDeleteScreen = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
      if (selectedEdgeId) {
        const connectedEdges = edges.filter(
          (e) => e.source === nodeId || e.target === nodeId,
        );
        if (connectedEdges.some((e) => e.id === selectedEdgeId)) {
          setSelectedEdgeId(null);
        }
      }
    },
    [selectedNodeId, selectedEdgeId, edges],
  );

  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleAddAppScreen = useCallback(
    (appScreen: AppScreen, position?: { x: number; y: number }) => {
      const newId = `screen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setNodes((prev) => {
        const nextIndex = prev.length;
        const newNode: SimulationNode = {
          id: newId,
          type: "screen",
          position: position ?? {
            x: 50 + (nextIndex % 4) * 250,
            y: 50 + Math.floor(nextIndex / 4) * 400,
          },
          data: {
            key: appScreen.key,
            title: appScreen.title,
            imageUrl: appScreen.imageUrl,
            isCompletion: false,
            isStart: false,
            hotspots: [],
          },
        };

        const updatedNodes = [...prev, newNode];
        return withStartAndCompletionFlags(updatedNodes);
      });
      setSelectedNodeId(newId);
      setSelectedHotspotId(null);
    },
    [],
  );

  const handleModalTargetAppChange = useCallback(
    (patch: Partial<SimulationDraft["targetApp"]>) => {
      setModalTargetApp((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const handleModalTargetAppNameChange = useCallback((value: string) => {
    setModalTargetApp((prev) => ({
      ...prev,
      appName: value,
      packageName: ensurePackageName(prev.packageName, value),
    }));
  }, []);

  const handleModalResolveStoreData = useCallback(async () => {
    if (!modalTargetApp.storeUrl.trim() || modalResolvingStoreApp) {
      return;
    }
    setModalResolvingStoreApp(true);
    try {
      const resolved = await resolveSimulationStoreAppRemote(
        modalTargetApp.storeUrl,
      );
      setModalTargetApp((prev) => ({
        ...prev,
        appName: resolved.appName || prev.appName,
        packageName: ensurePackageName(
          resolved.packageName || prev.packageName,
          resolved.appName || prev.appName,
        ),
        storeType: resolved.storeType ?? prev.storeType,
        storeUrl: resolved.canonicalUrl || prev.storeUrl,
        iconUrl: resolved.iconUrl || prev.iconUrl,
      }));
      setModalMediaError(null);
    } catch (error) {
      setModalMediaError(
        error instanceof Error
          ? error.message
          : language === "ru"
            ? "Не удалось получить данные приложения по ссылке."
            : "Failed to resolve app from store URL.",
      );
    } finally {
      setModalResolvingStoreApp(false);
    }
  }, [language, modalResolvingStoreApp, modalTargetApp.storeUrl]);

  const handleModalUploadMedia = useCallback(
    async (file: File) => {
      if (modalMediaBindingError) {
        setModalMediaError(modalMediaBindingError);
        return;
      }
      setModalMediaUploading(true);
      setModalMediaError(null);
      try {
        const asset = await uploadSimulationMediaAssetRemote(
          scopeKey,
          file,
          modalMediaBinding,
        );
        const mapped: MediaAsset = {
          id: asset.id,
          filename: asset.originalFilename,
          url: asset.fileUrl,
          uploadedAt: asset.createdAt,
        };
        const appKey = modalMediaBinding.appPackageName;
        const versionKey = buildAppVersionKey({
          appPackageName: modalMediaBinding.appPackageName,
          storeType: modalMediaBinding.storeType,
          minSupportedVersion: modalMediaBinding.minSupportedVersion,
          maxSupportedVersion: modalMediaBinding.maxSupportedVersion,
          releasedAt: modalMediaBinding.releasedAt || null,
        });
        setModalMediaAssets((assets) => [mapped, ...assets]);
        setAppScreens((screens) => [
          mapMediaAssetToAppScreen(mapped),
          ...screens,
        ]);
        setLoadedVersionScreens((prev) => ({ ...prev, [versionKey]: true }));
        setApplications((prev) => {
          const existingAppIndex = prev.findIndex(
            (item) => item.key === appKey,
          );
          if (existingAppIndex < 0) {
            const nextApp: AppMediaApplication = {
              key: appKey,
              appName: modalTargetApp.appName.trim()
                ? modalTargetApp.appName.trim()
                : deriveAppNameFromPackageName(appKey, appKey),
              iconUrl: modalTargetApp.iconUrl || null,
              expanded: true,
              versions: [
                {
                  key: versionKey,
                  storeType: modalMediaBinding.storeType,
                  minSupportedVersion: modalMediaBinding.minSupportedVersion,
                  maxSupportedVersion: modalMediaBinding.maxSupportedVersion,
                  releasedAt: modalMediaBinding.releasedAt || null,
                  assetsCount: 1,
                  expanded: true,
                  screensLoading: false,
                  screensError: null,
                  screens: [mapped],
                },
              ],
            };
            return [nextApp, ...prev];
          }

          return prev.map((item) => {
            if (item.key !== appKey) {
              return item;
            }
            const versionExists = item.versions.some(
              (version) => version.key === versionKey,
            );
            if (!versionExists) {
              return {
                ...item,
                appName: modalTargetApp.appName.trim() || item.appName,
                iconUrl: modalTargetApp.iconUrl || item.iconUrl,
                expanded: true,
                versions: [
                  {
                    key: versionKey,
                    storeType: modalMediaBinding.storeType,
                    minSupportedVersion: modalMediaBinding.minSupportedVersion,
                    maxSupportedVersion: modalMediaBinding.maxSupportedVersion,
                    releasedAt: modalMediaBinding.releasedAt || null,
                    assetsCount: 1,
                    expanded: true,
                    screensLoading: false,
                    screensError: null,
                    screens: [mapped],
                  },
                  ...item.versions,
                ],
              };
            }
            return {
              ...item,
              appName: modalTargetApp.appName.trim() || item.appName,
              iconUrl: modalTargetApp.iconUrl || item.iconUrl,
              versions: item.versions.map((version) =>
                version.key === versionKey
                  ? {
                      ...version,
                      expanded: true,
                      screens: [mapped, ...version.screens],
                      assetsCount: version.assetsCount + 1,
                    }
                  : version,
              ),
            };
          });
        });
        setAppsReloadToken((token) => token + 1);
      } catch (error) {
        setModalMediaError(
          error instanceof Error
            ? error.message
            : language === "ru"
              ? "Не удалось загрузить изображение."
              : "Failed to upload image.",
        );
      } finally {
        setModalMediaUploading(false);
      }
    },
    [
      language,
      modalMediaBinding,
      modalMediaBindingError,
      modalTargetApp.appName,
      modalTargetApp.iconUrl,
      scopeKey,
    ],
  );

  const toTargetAppFromVersion = useCallback(
    (
      app: AppMediaApplication,
      version: AppMediaVersion,
    ): SimulationDraft["targetApp"] => ({
      appName: app.appName,
      packageName: app.key,
      storeType: version.storeType,
      storeUrl: "",
      iconUrl: app.iconUrl ?? "",
      minSupportedVersion: version.minSupportedVersion,
      maxSupportedVersion: version.maxSupportedVersion,
      releasedAt: version.releasedAt ?? "",
    }),
    [],
  );

  const loadVersionScreens = useCallback(
    async (app: AppMediaApplication, version: AppMediaVersion) => {
      setApplications((prev) =>
        prev.map((item) =>
          item.key !== app.key
            ? item
            : {
                ...item,
                versions: item.versions.map((current) =>
                  current.key === version.key
                    ? {
                        ...current,
                        screensLoading: true,
                        screensError: null,
                      }
                    : current,
                ),
              },
        ),
      );
      try {
        const assets = await fetchSimulationMediaAssetsRemote(scopeKey, "", {
          appPackageName: app.key,
          storeType: version.storeType,
          minSupportedVersion: version.minSupportedVersion,
          maxSupportedVersion: version.maxSupportedVersion,
          releasedAt: version.releasedAt ?? "",
        });
        const mapped: MediaAsset[] = assets.map((asset) => ({
          id: asset.id,
          filename: asset.originalFilename,
          url: asset.fileUrl,
          uploadedAt: asset.createdAt,
        }));
        setApplications((prev) =>
          prev.map((item) =>
            item.key !== app.key
              ? item
              : {
                  ...item,
                  versions: item.versions.map((current) =>
                    current.key === version.key
                      ? {
                          ...current,
                          screensLoading: false,
                          screensError: null,
                          screens: mapped,
                        }
                      : current,
                  ),
                },
          ),
        );
        setLoadedVersionScreens((prev) => ({
          ...prev,
          [version.key]: true,
        }));
        setAppScreens(mapped.map(mapMediaAssetToAppScreen));
      } catch (error) {
        setApplications((prev) =>
          prev.map((item) =>
            item.key !== app.key
              ? item
              : {
                  ...item,
                  versions: item.versions.map((current) =>
                    current.key === version.key
                      ? {
                          ...current,
                          screensLoading: false,
                          screensError:
                            error instanceof Error
                              ? error.message
                              : language === "ru"
                                ? "Не удалось загрузить экраны приложения."
                                : "Failed to load app screens.",
                        }
                      : current,
                  ),
                },
          ),
        );
      }
    },
    [language, scopeKey],
  );

  const handleToggleApplication = useCallback(
    (appKey: string) => {
      const selected = applications.find((app) => app.key === appKey);
      if (!selected) {
        return;
      }

      const willOpen = !selected.expanded;
      setApplications((prev) =>
        prev.map((item) =>
          item.key === appKey ? { ...item, expanded: willOpen } : item,
        ),
      );
    },
    [applications],
  );

  const handleToggleVersion = useCallback(
    (appKey: string, versionKey: string) => {
      const selectedApp = applications.find((app) => app.key === appKey);
      const selectedVersion = selectedApp?.versions.find(
        (version) => version.key === versionKey,
      );
      if (!selectedApp || !selectedVersion) {
        return;
      }

      const willOpen = !selectedVersion.expanded;
      setApplications((prev) =>
        prev.map((app) =>
          app.key !== appKey
            ? app
            : {
                ...app,
                versions: app.versions.map((version) =>
                  version.key === versionKey
                    ? { ...version, expanded: willOpen }
                    : version,
                ),
              },
        ),
      );
      if (!willOpen) {
        return;
      }

      setTargetApp(toTargetAppFromVersion(selectedApp, selectedVersion));
      if (!loadedVersionScreens[versionKey]) {
        void loadVersionScreens(selectedApp, selectedVersion);
      } else {
        setAppScreens(selectedVersion.screens.map(mapMediaAssetToAppScreen));
      }
    },
    [
      applications,
      loadedVersionScreens,
      loadVersionScreens,
      toTargetAppFromVersion,
    ],
  );

  const handleOpenCreateMediaModal = useCallback(() => {
    setAddMediaModalMode("create");
    setModalTargetApp(emptyModalTargetApp);
    setModalMediaAssets([]);
    setModalMediaSearchQuery("");
    setModalMediaError(null);
    setModalResolvingStoreApp(false);
    setIsAddMediaModalOpen(true);
  }, []);

  const handleOpenEditMediaModal = useCallback(
    (appKey: string) => {
      const selectedApp = applications.find((app) => app.key === appKey);
      const selectedVersion =
        selectedApp?.versions.find((version) => version.expanded) ??
        selectedApp?.versions[0];
      if (!selectedApp || !selectedVersion) {
        return;
      }

      setAddMediaModalMode("edit");
      setModalTargetApp(toTargetAppFromVersion(selectedApp, selectedVersion));
      setModalMediaAssets(selectedVersion.screens);
      setModalMediaSearchQuery("");
      setModalMediaError(null);
      setModalResolvingStoreApp(false);
      setIsAddMediaModalOpen(true);
      if (!loadedVersionScreens[selectedVersion.key]) {
        void loadVersionScreens(selectedApp, selectedVersion);
      } else {
        setAppScreens(selectedVersion.screens.map(mapMediaAssetToAppScreen));
      }
    },
    [
      applications,
      loadVersionScreens,
      loadedVersionScreens,
      toTargetAppFromVersion,
    ],
  );

  const handleCloseAddMediaModal = useCallback(() => {
    setIsAddMediaModalOpen(false);
  }, []);

  const handleSubmitAddMediaModal = useCallback(() => {
    if (modalMediaBindingError) {
      return;
    }
    const normalizedAppName = modalTargetApp.appName.trim();
    if (!normalizedAppName) {
      return;
    }
    const normalizedTargetApp: SimulationDraft["targetApp"] = {
      ...modalTargetApp,
      appName: normalizedAppName,
      packageName: ensurePackageName(
        modalTargetApp.packageName,
        normalizedAppName,
      ),
      storeUrl: modalTargetApp.storeUrl.trim(),
      minSupportedVersion: modalTargetApp.minSupportedVersion.trim() || "1.0.0",
      maxSupportedVersion:
        modalTargetApp.maxSupportedVersion.trim() || "99.99.99",
      releasedAt: modalTargetApp.releasedAt.trim(),
    };
    setModalTargetApp(normalizedTargetApp);
    setTargetApp(normalizedTargetApp);
    setIsAddMediaModalOpen(false);
  }, [modalMediaBindingError, modalTargetApp]);

  const handleScreenAddFromAsset = useCallback(
    (asset: MediaAsset) => {
      handleAddAppScreen(mapMediaAssetToAppScreen(asset));
    },
    [handleAddAppScreen],
  );

  const handleModalScreenRename = useCallback(
    async (screen: MediaAsset, nextName: string) => {
      const trimmedName = nextName.trim();
      if (!trimmedName) {
        return;
      }
      const parts = splitFilename(screen.filename);
      if (trimmedName === parts.base) {
        return;
      }

      const normalizedFilename = `${trimmedName}${parts.extension}`;
      try {
        const updatedAsset = await renameSimulationMediaAssetRemote(
          screen.id,
          normalizedFilename,
        );
        const mapped: MediaAsset = {
          id: updatedAsset.id,
          filename: updatedAsset.originalFilename,
          url: updatedAsset.fileUrl,
          uploadedAt: updatedAsset.createdAt,
        };
        setModalMediaAssets((prev) =>
          prev.map((item) => (item.id === screen.id ? mapped : item)),
        );
        setApplications((prev) =>
          prev.map((app) => ({
            ...app,
            versions: app.versions.map((version) => ({
              ...version,
              screens: version.screens.map((item) =>
                item.id === screen.id ? mapped : item,
              ),
            })),
          })),
        );
        setAppScreens((prev) =>
          prev.map((item) =>
            item.id === screen.id ? mapMediaAssetToAppScreen(mapped) : item,
          ),
        );
        setModalMediaError(null);
      } catch (error) {
        setModalMediaError(
          error instanceof Error
            ? error.message
            : language === "ru"
              ? "Не удалось переименовать экран."
              : "Failed to rename screen.",
        );
      }
    },
    [language],
  );

  const handleModalScreenDelete = useCallback(
    async (screen: MediaAsset) => {
      try {
        await deleteSimulationMediaAssetRemote(screen.id);
        setModalMediaAssets((prev) =>
          prev.filter((item) => item.id !== screen.id),
        );
        setApplications((prev) =>
          prev.map((app) => ({
            ...app,
            versions: app.versions.map((version) => {
              const removedCount = version.screens.some(
                (item) => item.id === screen.id,
              )
                ? 1
                : 0;
              return {
                ...version,
                screens: version.screens.filter(
                  (item) => item.id !== screen.id,
                ),
                assetsCount: Math.max(0, version.assetsCount - removedCount),
              };
            }),
          })),
        );
        setAppScreens((prev) => prev.filter((item) => item.id !== screen.id));
        setModalMediaError(null);
        setAppsReloadToken((token) => token + 1);
      } catch (error) {
        setModalMediaError(
          error instanceof Error
            ? error.message
            : language === "ru"
              ? "Не удалось удалить экран."
              : "Failed to delete screen.",
        );
      }
    },
    [language],
  );

  const handleScreenDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>, screen: MediaAsset) => {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData(
        "application/x-simulation-screen",
        JSON.stringify({ screen, targetApp }),
      );
    },
    [targetApp],
  );

  const handleModalScreenDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>, screen: MediaAsset) => {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData(
        "application/x-simulation-screen",
        JSON.stringify({ screen, targetApp: modalTargetApp }),
      );
    },
    [modalTargetApp],
  );

  const handleCanvasDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (
        event.dataTransfer.types.includes("application/x-simulation-screen") ||
        event.dataTransfer.types.includes(
          "application/x-simulation-library-item",
        )
      ) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }
    },
    [],
  );

  const handleCanvasDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      const libraryPayloadRaw = event.dataTransfer.getData(
        "application/x-simulation-library-item",
      );
      if (libraryPayloadRaw) {
        event.preventDefault();
        try {
          const payload = JSON.parse(libraryPayloadRaw) as {
            itemId: string;
          };
          if (!payload?.itemId) {
            return;
          }
          const dropFlowPosition = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });
          await handleInsertLibraryItem(payload.itemId, { dropFlowPosition });
        } catch {
          // Ignore malformed drag payload.
        }
        return;
      }

      const payloadRaw = event.dataTransfer.getData(
        "application/x-simulation-screen",
      );
      if (!payloadRaw) {
        return;
      }
      event.preventDefault();
      try {
        const payload = JSON.parse(payloadRaw) as {
          screen: MediaAsset;
          targetApp?: SimulationDraft["targetApp"];
        };
        if (!payload?.screen?.id) {
          return;
        }
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        handleAddAppScreen(mapMediaAssetToAppScreen(payload.screen), position);
        if (payload.targetApp) {
          setTargetApp(payload.targetApp);
        }
      } catch {
        // Ignore malformed drag payload.
      }
    },
    [handleAddAppScreen, handleInsertLibraryItem, screenToFlowPosition],
  );

  const handleDrawHotspot: HotspotDrawHandler = useCallback(
    (nodeId, hotspotData) => {
      const newHotspot: HotspotData = {
        id: `hotspot-${Date.now()}`,
        label: "",
        hint: "",
        ...hotspotData,
        targetScreenId: null,
      };
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  hotspots: [...node.data.hotspots, newHotspot],
                },
              }
            : node,
        ),
      );
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);
      setSelectedHotspotId(newHotspot.id);
    },
    [],
  );

  const handleHotspotGeometryChange: HotspotChangeHandler = useCallback(
    (hotspotId, nodeId, updates) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id !== nodeId) return node;
          return {
            ...node,
            data: {
              ...node.data,
              hotspots: node.data.hotspots.map((h) =>
                h.id === hotspotId ? { ...h, ...updates } : h,
              ),
            },
          };
        }),
      );
    },
    [],
  );

  const handleUpdateHotspot = useCallback(
    (hotspotId: string, updates: Partial<HotspotData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id !== selectedNodeId) return node;
          return {
            ...node,
            data: {
              ...node.data,
              hotspots: node.data.hotspots.map((h) =>
                h.id === hotspotId ? { ...h, ...updates } : h,
              ),
            },
          };
        }),
      );
    },
    [selectedNodeId],
  );

  const handleDeleteHotspot = useCallback(
    (hotspotId: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id !== selectedNodeId) return node;
          return {
            ...node,
            data: {
              ...node.data,
              hotspots: node.data.hotspots.filter((h) => h.id !== hotspotId),
            },
          };
        }),
      );
      if (selectedHotspotId === hotspotId) {
        setSelectedHotspotId(null);
      }
    },
    [selectedNodeId, selectedHotspotId],
  );

  const handleHotspotSelect: HotspotSelectHandler = useCallback(
    (hotspotId, nodeId) => {
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);
      setSelectedHotspotId(hotspotId);
    },
    [],
  );

  const handleScreenSelect: ScreenSelectHandler = useCallback((nodeId) => {
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
    setSelectedHotspotId(null);
  }, []);

  const handleHotspotDragStart = useCallback(
    (
      hotspotId: string,
      sourceNodeId: string,
      startX: number,
      startY: number,
    ) => {
      setSelectedNodeId(sourceNodeId);
      setSelectedEdgeId(null);
      setSelectedHotspotId(hotspotId);
      const newDragging = {
        hotspotId,
        sourceNodeId,
        startX,
        startY,
        currentX: startX,
        currentY: startY,
      };
      draggingHotspotRef.current = newDragging;
      setDraggingHotspot(newDragging);
    },
    [],
  );

  const clearHotspotDragState = useCallback(() => {
    draggingHotspotRef.current = null;
    setDraggingHotspot(null);
  }, []);

  const updateHotspotTargetLink = useCallback(
    (sourceNodeId: string, hotspotId: string, targetNodeId: string | null) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id !== sourceNodeId) return node;
          return {
            ...node,
            data: {
              ...node.data,
              hotspots: node.data.hotspots.map((hotspot) =>
                hotspot.id === hotspotId
                  ? { ...hotspot, targetScreenId: targetNodeId }
                  : hotspot,
              ),
            },
          };
        }),
      );

      setEdges((eds) => {
        const filtered = eds.filter(
          (edge) => edge.data?.hotspotId !== hotspotId,
        );
        if (!targetNodeId) {
          return filtered;
        }
        return [
          ...filtered,
          {
            id: `edge-${sourceNodeId}-${targetNodeId}-${hotspotId}`,
            source: sourceNodeId,
            target: targetNodeId,
            type: "transition",
            data: {
              label: "",
              hotspotId,
            },
          },
        ];
      });
    },
    [],
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!draggingHotspotRef.current) return;
      const current = draggingHotspotRef.current;
      const next = { ...current, currentX: e.clientX, currentY: e.clientY };
      draggingHotspotRef.current = next;
      setDraggingHotspot(next);
    };

    const handlePointerUp = (e: PointerEvent) => {
      const current = draggingHotspotRef.current;
      if (!current) return;
      const released = { ...current, currentX: e.clientX, currentY: e.clientY };
      draggingHotspotRef.current = released;
      setDraggingHotspot(released);
      const finishDragging = () => clearHotspotDragState();

      const dx = released.currentX - released.startX;
      const dy = released.currentY - released.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= HOTSPOT_LINK_DRAG_THRESHOLD_PX) {
        setSelectedNodeId(released.sourceNodeId);
        setSelectedEdgeId(null);
        setSelectedHotspotId(released.hotspotId);
        finishDragging();
        return;
      }

      // It's a drag - find target
      const flowPoint = screenToFlowPositionRef.current({
        x: released.currentX,
        y: released.currentY,
      });
      const intersectingNodes = getIntersectingNodesRef.current(
        {
          x: flowPoint.x - HOTSPOT_DROP_HITBOX_SIZE / 2,
          y: flowPoint.y - HOTSPOT_DROP_HITBOX_SIZE / 2,
          width: HOTSPOT_DROP_HITBOX_SIZE,
          height: HOTSPOT_DROP_HITBOX_SIZE,
        },
        true,
      ) as SimulationNode[];
      const targetNodeId =
        findClosestTargetNodeId(
          intersectingNodes,
          flowPoint,
          released.sourceNodeId,
        ) ??
        findNodeIdAtFlowPoint(
          flowPoint,
          released.sourceNodeId,
          nodesRef.current,
        ) ??
        findNodeIdAtPoint(
          released.currentX,
          released.currentY,
          released.sourceNodeId,
        );

      const currentHotspot = nodesRef.current
        .find((node) => node.id === released.sourceNodeId)
        ?.data.hotspots.find((hotspot) => hotspot.id === released.hotspotId);
      const previousTargetNodeId = currentHotspot?.targetScreenId ?? null;

      if (targetNodeId && targetNodeId !== released.sourceNodeId) {
        if (previousTargetNodeId !== targetNodeId) {
          updateHotspotTargetLink(
            released.sourceNodeId,
            released.hotspotId,
            targetNodeId,
          );
        }
        setSelectedNodeId(released.sourceNodeId);
        setSelectedEdgeId(null);
        setSelectedHotspotId(released.hotspotId);
      } else {
        if (previousTargetNodeId) {
          updateHotspotTargetLink(
            released.sourceNodeId,
            released.hotspotId,
            null,
          );
          setDropHint({
            message:
              languageRef.current === "ru"
                ? "Связь удалена"
                : "Connection removed",
            x: released.currentX,
            y: released.currentY - 40,
          });
          setTimeout(() => setDropHint(null), 1500);
        } else {
          setDropHint({
            message:
              languageRef.current === "ru"
                ? "Отпустите на экране для создания связи"
                : "Drop on a screen to create connection",
            x: released.currentX,
            y: released.currentY - 40,
          });
          setTimeout(() => setDropHint(null), 2000);
        }
        setSelectedNodeId(released.sourceNodeId);
        setSelectedEdgeId(null);
        setSelectedHotspotId(released.hotspotId);
      }

      finishDragging();
    };

    const handlePointerCancel = () => {
      if (!draggingHotspotRef.current) {
        return;
      }
      clearHotspotDragState();
      setDropHint(null);
    };

    const handleWindowBlur = () => {
      if (!draggingHotspotRef.current) {
        return;
      }
      clearHotspotDragState();
      setDropHint(null);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        return;
      }
      if (!draggingHotspotRef.current) {
        return;
      }
      clearHotspotDragState();
      setDropHint(null);
    };

    window.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("pointerup", handlePointerUp, true);
    window.addEventListener("pointercancel", handlePointerCancel, true);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", handlePointerUp, true);
      window.removeEventListener("pointercancel", handlePointerCancel, true);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clearHotspotDragState, updateHotspotTargetLink]);

  useEffect(() => {
    if (!isAddMediaModalOpen && !previewImage) {
      return;
    }
    clearHotspotDragState();
    setDropHint(null);
  }, [clearHotspotDragState, isAddMediaModalOpen, previewImage]);

  const nodesWithMode = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onDrawHotspot: handleDrawHotspot,
      onHotspotChange: handleHotspotGeometryChange,
      onHotspotDragStart: handleHotspotDragStart,
      onHotspotSelect: handleHotspotSelect,
      onScreenSelect: handleScreenSelect,
      selectedHotspotId,
      nodeId: node.id,
      language,
    },
  }));

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedHotspot = selectedNode?.data.hotspots.find(
    (h) => h.id === selectedHotspotId,
  );
  const selectedNodeForProperties = selectedHotspot ? null : selectedNode;
  useEffect(() => {
    if (isLoading) {
      return;
    }

    const currentSnapshot: EditorHistorySnapshot = { nodes, edges };
    const currentSignature = buildEditorHistorySignature(currentSnapshot);

    if (historyLastSignatureRef.current === null) {
      historyLastSignatureRef.current = currentSignature;
      historyLastSnapshotRef.current =
        cloneEditorHistorySnapshot(currentSnapshot);
      historyPastRef.current = [];
      historyFutureRef.current = [];
      return;
    }

    if (isApplyingHistoryRef.current) {
      historyLastSignatureRef.current = currentSignature;
      historyLastSnapshotRef.current =
        cloneEditorHistorySnapshot(currentSnapshot);
      isApplyingHistoryRef.current = false;
      return;
    }

    if (historyLastSignatureRef.current === currentSignature) {
      return;
    }

    const previousSnapshot = historyLastSnapshotRef.current;
    if (previousSnapshot) {
      historyPastRef.current.push(cloneEditorHistorySnapshot(previousSnapshot));
    }
    if (historyPastRef.current.length > 100) {
      historyPastRef.current.shift();
    }
    historyFutureRef.current = [];
    historyLastSignatureRef.current = currentSignature;
    historyLastSnapshotRef.current =
      cloneEditorHistorySnapshot(currentSnapshot);
  }, [edges, isLoading, nodes]);

  const applyHistorySnapshot = useCallback(
    (snapshot: EditorHistorySnapshot) => {
      const nextSnapshot = cloneEditorHistorySnapshot(snapshot);
      isApplyingHistoryRef.current = true;
      setNodes(nextSnapshot.nodes);
      setEdges(nextSnapshot.edges);
      setSelectedEdgeId(null);
      setSelectedHotspotId(null);
      setSelectedNodeId(null);
    },
    [],
  );

  const handleUndo = useCallback((): boolean => {
    const previousSnapshot = historyPastRef.current.pop();
    if (!previousSnapshot) {
      return false;
    }

    const currentSnapshot = cloneEditorHistorySnapshot({
      nodes: nodesRef.current,
      edges: edgesRef.current,
    });
    historyFutureRef.current.push(currentSnapshot);
    applyHistorySnapshot(previousSnapshot);
    return true;
  }, [applyHistorySnapshot]);

  const handleRedo = useCallback((): boolean => {
    const nextSnapshot = historyFutureRef.current.pop();
    if (!nextSnapshot) {
      return false;
    }

    const currentSnapshot = cloneEditorHistorySnapshot({
      nodes: nodesRef.current,
      edges: edgesRef.current,
    });
    historyPastRef.current.push(currentSnapshot);
    applyHistorySnapshot(nextSnapshot);
    return true;
  }, [applyHistorySnapshot]);

  const viewportKey = `${viewport.x}:${viewport.y}:${viewport.zoom}`;
  const draggingHotspotKey = draggingHotspot
    ? `${draggingHotspot.sourceNodeId}:${draggingHotspot.hotspotId}`
    : null;
  const toCanvasPoint = useCallback(
    (point: { x: number; y: number }): { x: number; y: number } => {
      const canvasElement = canvasRef.current;
      if (!canvasElement) {
        return point;
      }
      const rect = canvasElement.getBoundingClientRect();
      return {
        x: point.x - rect.left,
        y: point.y - rect.top,
      };
    },
    [],
  );
  const persistentConnections = useMemo(() => {
    void viewportKey;
    void sidebarWidth;
    void propertiesWidth;
    void isSidebarResizing;
    void isPropertiesResizing;
    void canvasLayoutTick;
    const connections: Array<{
      id: string;
      path: string;
      sourceX: number;
      sourceY: number;
      targetX: number;
      targetY: number;
      isActive: boolean;
    }> = [];

    for (const sourceNode of nodes) {
      const sourceWidth =
        sourceNode.width ??
        sourceNode.measured?.width ??
        SCREEN_NODE_FALLBACK_WIDTH;
      const sourceHeight =
        sourceNode.height ??
        sourceNode.measured?.height ??
        SCREEN_NODE_FALLBACK_HEIGHT;
      const sourceImageHeight = Math.max(
        1,
        sourceHeight - SCREEN_NODE_HEADER_HEIGHT,
      );
      const sourceImageTopOffset = Math.max(
        0,
        sourceHeight - sourceImageHeight,
      );

      for (const hotspot of sourceNode.data.hotspots) {
        if (draggingHotspotKey === `${sourceNode.id}:${hotspot.id}`) {
          continue;
        }
        if (!hotspot.targetScreenId) {
          continue;
        }
        const isConnectionRelatedToSelectedNode = selectedNodeId
          ? sourceNode.id === selectedNodeId ||
            hotspot.targetScreenId === selectedNodeId
          : false;
        const shouldRenderConnection = showAllConnections
          ? true
          : selectedHotspotId
            ? hotspot.id === selectedHotspotId
            : isConnectionRelatedToSelectedNode;

        if (!shouldRenderConnection) {
          continue;
        }
        const targetNode = nodes.find(
          (node) => node.id === hotspot.targetScreenId,
        );
        if (!targetNode) {
          continue;
        }

        const targetWidth =
          targetNode.width ??
          targetNode.measured?.width ??
          SCREEN_NODE_FALLBACK_WIDTH;
        const targetHeight =
          targetNode.height ??
          targetNode.measured?.height ??
          SCREEN_NODE_FALLBACK_HEIGHT;

        const sourceFlowPoint = {
          x:
            sourceNode.position.x +
            ((hotspot.x + hotspot.width / 2) / 100) * sourceWidth,
          y:
            sourceNode.position.y +
            sourceImageTopOffset +
            ((hotspot.y + hotspot.height / 2) / 100) * sourceImageHeight,
        };
        const targetAnchor = resolveNearestTargetAnchor(sourceFlowPoint, {
          x: targetNode.position.x,
          y: targetNode.position.y,
          width: targetWidth,
          height: targetHeight,
        });

        const sourcePoint = toCanvasPoint(
          flowToScreenPosition(sourceFlowPoint),
        );
        const targetPoint = toCanvasPoint(
          flowToScreenPosition(targetAnchor.point),
        );
        const path = buildCurvedConnectionPath(
          sourcePoint,
          targetPoint,
          targetAnchor.side,
        );

        connections.push({
          id: `hotspot-link-${sourceNode.id}-${hotspot.id}-${targetNode.id}`,
          path,
          sourceX: sourcePoint.x,
          sourceY: sourcePoint.y,
          targetX: targetPoint.x,
          targetY: targetPoint.y,
          isActive:
            hotspot.id === selectedHotspotId ||
            (!selectedHotspotId && isConnectionRelatedToSelectedNode),
        });
      }
    }

    return connections;
  }, [
    nodes,
    selectedNodeId,
    selectedHotspotId,
    showAllConnections,
    flowToScreenPosition,
    toCanvasPoint,
    viewportKey,
    draggingHotspotKey,
    sidebarWidth,
    propertiesWidth,
    isSidebarResizing,
    isPropertiesResizing,
    canvasLayoutTick,
  ]);
  const openImagePreview = useCallback(
    (url: string, title: string) => {
      const safeUrl = url.trim();
      if (!safeUrl) {
        return;
      }
      setPreviewImage({
        url: safeUrl,
        title: title.trim() || (language === "ru" ? "Экран" : "Screen"),
      });
    },
    [language],
  );

  const closeImagePreview = useCallback(() => {
    setPreviewImage(null);
  }, []);

  const clearTransientLinkVisuals = useCallback(() => {
    clearHotspotDragState();
    setDropHint(null);
  }, [clearHotspotDragState]);

  const finishSidebarResize = useCallback(() => {
    sidebarResizeRef.current = null;
    setIsSidebarResizing(false);
    if (propertiesResizeRef.current) {
      return;
    }
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
  }, []);

  const finishPropertiesResize = useCallback(() => {
    propertiesResizeRef.current = null;
    setIsPropertiesResizing(false);
    if (sidebarResizeRef.current) {
      return;
    }
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
  }, []);

  useEffect(() => {
    const handleSidebarPointerMove = (event: PointerEvent) => {
      const resizeState = sidebarResizeRef.current;
      if (!resizeState || event.pointerId !== resizeState.pointerId) {
        return;
      }
      const delta = event.clientX - resizeState.startX;
      setSidebarWidth(clampSidebarWidth(resizeState.startWidth + delta));
    };

    const handleSidebarPointerUp = (event: PointerEvent) => {
      const resizeState = sidebarResizeRef.current;
      if (!resizeState || event.pointerId !== resizeState.pointerId) {
        return;
      }
      finishSidebarResize();
    };

    window.addEventListener("pointermove", handleSidebarPointerMove, true);
    window.addEventListener("pointerup", handleSidebarPointerUp, true);
    window.addEventListener("pointercancel", handleSidebarPointerUp, true);

    return () => {
      window.removeEventListener("pointermove", handleSidebarPointerMove, true);
      window.removeEventListener("pointerup", handleSidebarPointerUp, true);
      window.removeEventListener("pointercancel", handleSidebarPointerUp, true);
      finishSidebarResize();
    };
  }, [finishSidebarResize]);

  const handleSidebarResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      clearTransientLinkVisuals();
      sidebarResizeRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: sidebarWidth,
      };
      setIsSidebarResizing(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [clearTransientLinkVisuals, sidebarWidth],
  );

  useEffect(() => {
    const handlePropertiesPointerMove = (event: PointerEvent) => {
      const resizeState = propertiesResizeRef.current;
      if (!resizeState || event.pointerId !== resizeState.pointerId) {
        return;
      }
      const delta = event.clientX - resizeState.startX;
      setPropertiesWidth(clampPropertiesWidth(resizeState.startWidth - delta));
    };

    const handlePropertiesPointerUp = (event: PointerEvent) => {
      const resizeState = propertiesResizeRef.current;
      if (!resizeState || event.pointerId !== resizeState.pointerId) {
        return;
      }
      finishPropertiesResize();
    };

    window.addEventListener("pointermove", handlePropertiesPointerMove, true);
    window.addEventListener("pointerup", handlePropertiesPointerUp, true);
    window.addEventListener("pointercancel", handlePropertiesPointerUp, true);

    return () => {
      window.removeEventListener(
        "pointermove",
        handlePropertiesPointerMove,
        true,
      );
      window.removeEventListener("pointerup", handlePropertiesPointerUp, true);
      window.removeEventListener(
        "pointercancel",
        handlePropertiesPointerUp,
        true,
      );
      finishPropertiesResize();
    };
  }, [finishPropertiesResize]);

  const handlePropertiesResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      clearTransientLinkVisuals();
      propertiesResizeRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: propertiesWidth,
      };
      setIsPropertiesResizing(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [clearTransientLinkVisuals, propertiesWidth],
  );

  useEffect(() => {
    if (!isSidebarResizing && !isPropertiesResizing) {
      return;
    }
    clearTransientLinkVisuals();
  }, [clearTransientLinkVisuals, isPropertiesResizing, isSidebarResizing]);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(() => {
      setCanvasLayoutTick((tick) => tick + 1);
    });
    observer.observe(canvasElement);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      if (event.key === "Escape" && previewImage) {
        event.preventDefault();
        closeImagePreview();
        return;
      }
      if (isEditableElement(event.target)) {
        return;
      }
      if (previewImage) {
        return;
      }
      if (isAddMediaModalOpen) {
        return;
      }
      const hasPrimaryModifier = event.ctrlKey || event.metaKey;
      const isUndoShortcut =
        hasPrimaryModifier &&
        !event.altKey &&
        !event.shiftKey &&
        event.code === "KeyZ";
      if (isUndoShortcut) {
        event.preventDefault();
        handleUndo();
        return;
      }

      const isRedoShortcut =
        hasPrimaryModifier &&
        !event.altKey &&
        ((event.shiftKey && event.code === "KeyZ") ||
          (!event.shiftKey && event.code === "KeyY"));
      if (isRedoShortcut) {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      if (selectedHotspotId && selectedNodeId) {
        event.preventDefault();
        handleDeleteHotspot(selectedHotspotId);
        return;
      }

      if (selectedNodeId) {
        event.preventDefault();
        handleDeleteScreen(selectedNodeId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    closeImagePreview,
    handleDeleteHotspot,
    handleDeleteScreen,
    handleRedo,
    handleUndo,
    isAddMediaModalOpen,
    previewImage,
    selectedHotspotId,
    selectedNodeId,
  ]);

  const screensTab = (
    <ScreensTab
      language={language}
      nodes={nodes}
      selectedNodeId={selectedNodeId}
      onSelectNode={handleSelectNode}
      onAddScreen={handleAddScreen}
      onDeleteScreen={handleDeleteScreen}
    />
  );

  const appMediaTab = (
    <AppMediaTab
      language={language}
      applications={applications}
      appsLoading={appsLoading}
      appsError={appsError}
      appSearchQuery={appSearchQuery}
      onAppSearchQueryChange={setAppSearchQuery}
      onToggleApplication={handleToggleApplication}
      onToggleVersion={handleToggleVersion}
      onOpenCreateModal={handleOpenCreateMediaModal}
      onOpenEditModal={handleOpenEditMediaModal}
      onScreenAdd={handleScreenAddFromAsset}
      onScreenDragStart={handleScreenDragStart}
      modalOpen={isAddMediaModalOpen}
      modalMode={addMediaModalMode}
      onCloseModal={handleCloseAddMediaModal}
      modalTargetApp={modalTargetApp}
      onModalTargetAppNameChange={handleModalTargetAppNameChange}
      onModalTargetAppChange={handleModalTargetAppChange}
      onModalResolveStoreData={handleModalResolveStoreData}
      modalResolvingStoreData={modalResolvingStoreApp}
      modalMediaSearchQuery={modalMediaSearchQuery}
      onModalMediaSearchQueryChange={setModalMediaSearchQuery}
      modalMediaAssets={modalMediaAssets}
      modalMediaLoading={modalMediaLoading}
      modalMediaUploading={modalMediaUploading}
      modalMediaError={modalMediaError}
      modalMediaHint={modalMediaBindingError}
      onModalUploadMedia={handleModalUploadMedia}
      onModalScreenRename={handleModalScreenRename}
      onModalScreenDelete={handleModalScreenDelete}
      onModalSubmit={handleSubmitAddMediaModal}
      modalSubmitDisabled={Boolean(modalMediaBindingError)}
      onModalScreenDragStart={handleModalScreenDragStart}
      onPreviewImage={openImagePreview}
    />
  );

  const libraryTab = (
    <LibraryTab
      language={language}
      scopeKey={scopeKey}
      quickFilter={libraryBindingFilter}
      onSaveScenario={handleSaveLibraryScenario}
      onInsertScenario={handleInsertLibraryItem}
    />
  );

  return (
    <div className={styles.container}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <a href={`/dashboard?lang=${language}`} className={styles.backButton}>
            ← {labels.backToMenu}
          </a>
          <span className={styles.scope}>{scopeLabel}</span>
        </div>
        <div className={styles.toolbarCenter}>
          <input
            type="text"
            className={styles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={labels.scenarioPlaceholder}
            disabled={isLoading}
          />
        </div>
        <div className={styles.toolbarRight}>
          <button
            className={styles.button}
            onClick={handleAddScreen}
            disabled={isLoading}
          >
            {labels.addScreen}
          </button>
          <button
            className={styles.buttonSecondary}
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? "..." : labels.save}
          </button>
          <button
            className={styles.buttonSecondary}
            onClick={handleExport}
            disabled={isLoading}
          >
            {labels.export}
          </button>
          {lastSavedAt && (
            <span className={styles.savedAt}>
              {language === "ru" ? "Сохранено" : "Saved"} {lastSavedAt}
            </span>
          )}
        </div>
      </header>

      <div className={styles.main}>
        <div
          className={`${styles.sidebarContainer} ${isSidebarResizing ? styles.sidebarContainerResizing : ""}`}
          style={{ width: `${sidebarWidth}px` }}
        >
          <aside className={styles.sidebar}>
            <ToolsPanel
              language={language}
              screensTab={screensTab}
              appMediaTab={appMediaTab}
              libraryTab={libraryTab}
            />
          </aside>
          <div
            className={styles.sidebarResizeHandle}
            onPointerDown={handleSidebarResizeStart}
            role="separator"
            aria-orientation="vertical"
            aria-label={labels.resizeSidebar}
          />
        </div>

        <div
          ref={canvasRef}
          className={styles.canvas}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
        >
          <ReactFlow
            nodes={nodesWithMode}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            deleteKeyCode={null}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            minZoom={0.1}
            maxZoom={2}
            className={styles.reactFlow}
            onNodeClick={(_, node) => {
              setSelectedNodeId(node.id);
              setSelectedHotspotId(null);
            }}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
              setSelectedHotspotId(null);
            }}
          >
            <Background gap={16} size={1} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const data = node.data as ScreenNodeData | undefined;
                if (data?.isStart) return "#10b981";
                if (data?.isCompletion) return "#f59e0b";
                return "#3b82f6";
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
            <Panel position="top-right">
              <div className={styles.panelControls}>
                <div className={styles.helpText}>
                  {language === "ru"
                    ? "Тяните по пустому месту скриншота, чтобы создать зону. Тяните зону для связи, а верхнюю полоску зоны — для перемещения."
                    : "Drag on empty screen area to create a hotspot. Drag hotspot body to link and use top grip to move it."}
                </div>
                <button
                  type="button"
                  className={styles.connectionsToggle}
                  onClick={() => setShowAllConnections((prev) => !prev)}
                >
                  {showAllConnections
                    ? labels.showOnlySelectedConnections
                    : labels.showAllConnections}
                </button>
              </div>
            </Panel>
          </ReactFlow>

          {!isAddMediaModalOpen && persistentConnections.length > 0 && (
            <svg className={styles.persistentConnections}>
              {persistentConnections.map((connection) => (
                <g key={connection.id}>
                  <path
                    d={connection.path}
                    className={`${styles.persistentConnectionLine} ${connection.isActive ? styles.persistentConnectionLineActive : ""}`}
                    fill="none"
                  />
                  <circle
                    cx={connection.sourceX}
                    cy={connection.sourceY}
                    r={4}
                    className={styles.persistentConnectionPoint}
                  />
                  <circle
                    cx={connection.targetX}
                    cy={connection.targetY}
                    r={3}
                    className={styles.persistentConnectionTargetPoint}
                  />
                </g>
              ))}
            </svg>
          )}

          {!isAddMediaModalOpen && !previewImage && draggingHotspot && (
            <svg className={styles.dragLine}>
              <path
                d={buildDragPreviewPath(
                  { x: draggingHotspot.startX, y: draggingHotspot.startY },
                  {
                    x: draggingHotspot.currentX,
                    y: draggingHotspot.currentY,
                  },
                )}
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5,5"
                fill="none"
                strokeLinecap="round"
              />
              <circle
                cx={draggingHotspot.startX}
                cy={draggingHotspot.startY}
                r={6}
                fill="#10b981"
              />
            </svg>
          )}

          {!previewImage && dropHint && (
            <div
              className={styles.dropHint}
              style={{
                left: dropHint.x,
                top: dropHint.y,
              }}
            >
              {dropHint.message}
            </div>
          )}
        </div>

        <div
          className={`${styles.propertiesContainer} ${isPropertiesResizing ? styles.propertiesContainerResizing : ""}`}
          style={{ width: `${propertiesWidth}px` }}
        >
          <div
            className={styles.propertiesResizeHandle}
            onPointerDown={handlePropertiesResizeStart}
            role="separator"
            aria-orientation="vertical"
            aria-label={labels.resizeProperties}
          />
          <aside className={styles.properties}>
            <h3 className={styles.propertiesTitle}>{labels.propertiesTitle}</h3>
            {selectedNodeForProperties ? (
              <div className={styles.propertiesContent}>
                {(selectedNodeForProperties.data.isStart ||
                  selectedNodeForProperties.data.isCompletion) && (
                  <div className={styles.screenFlags}>
                    {selectedNodeForProperties.data.isStart && (
                      <span className={styles.flagStart}>
                        {labels.startScreen}
                      </span>
                    )}
                    {selectedNodeForProperties.data.isCompletion && (
                      <span className={styles.flagEnd}>{labels.endScreen}</span>
                    )}
                  </div>
                )}
                <div className={styles.field}>
                  <label className={styles.label}>{labels.screenTitle}</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={selectedNodeForProperties.data.title}
                    onChange={(e) =>
                      setNodes((nds) =>
                        nds.map((n) =>
                          n.id === selectedNodeId
                            ? {
                                ...n,
                                data: { ...n.data, title: e.target.value },
                              }
                            : n,
                        ),
                      )
                    }
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{labels.screenImage}</label>
                  {selectedNodeForProperties.data.imageUrl ? (
                    <div className={styles.imagePreview}>
                      <img
                        src={selectedNodeForProperties.data.imageUrl}
                        alt=""
                        className={styles.previewImg}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          openImagePreview(
                            selectedNodeForProperties.data.imageUrl,
                            selectedNodeForProperties.data.title,
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openImagePreview(
                              selectedNodeForProperties.data.imageUrl,
                              selectedNodeForProperties.data.title,
                            );
                          }
                        }}
                      />
                      <button
                        className={styles.removeImageButton}
                        onClick={() =>
                          setNodes((nds) =>
                            nds.map((n) =>
                              n.id === selectedNodeId
                                ? { ...n, data: { ...n.data, imageUrl: "" } }
                                : n,
                            ),
                          )
                        }
                      >
                        {labels.removeImage}
                      </button>
                    </div>
                  ) : (
                    <div className={styles.imageGrid}>
                      {appScreens.slice(0, 6).map((screen) => (
                        <button
                          key={screen.id}
                          className={styles.imageOption}
                          onClick={() =>
                            setNodes((nds) =>
                              nds.map((n) =>
                                n.id === selectedNodeId
                                  ? {
                                      ...n,
                                      data: {
                                        ...n.data,
                                        imageUrl: screen.imageUrl,
                                        title: n.data.title || screen.title,
                                      },
                                    }
                                  : n,
                              ),
                            )
                          }
                          onDoubleClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            openImagePreview(
                              screen.imageUrl,
                              screen.title || screen.key,
                            );
                          }}
                          title={labels.imagePreviewHint}
                        >
                          <img src={screen.imageUrl} alt={screen.title} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className={styles.hotspots}>
                  <h4 className={styles.hotspotsTitle}>
                    {labels.hotspotsTitle} (
                    {selectedNodeForProperties.data.hotspots.length})
                  </h4>
                  {selectedNodeForProperties.data.hotspots.length === 0 ? (
                    <p className={styles.noHotspots}>{labels.noHotspots}</p>
                  ) : (
                    <ul className={styles.hotspotList}>
                      {selectedNodeForProperties.data.hotspots.map((h) => (
                        <li
                          key={h.id}
                          className={`${styles.hotspotItem} ${selectedHotspotId === h.id ? styles.hotspotItemActive : ""}`}
                          onClick={() => setSelectedHotspotId(h.id)}
                        >
                          <span>{h.label || "Untitled"}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : selectedHotspot ? (
              <div className={styles.propertiesContent}>
                <div className={styles.hotspotHeader}>
                  <span className={styles.hotspotLabel}>
                    {language === "ru" ? "Зона перехода" : "Hotspot"}
                  </span>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{labels.hotspotLabel}</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={selectedHotspot.label}
                    onChange={(e) =>
                      handleUpdateHotspot(selectedHotspotId!, {
                        label: e.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{labels.hotspotHint}</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={selectedHotspot.hint}
                    onChange={(e) =>
                      handleUpdateHotspot(selectedHotspotId!, {
                        hint: e.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{labels.hotspotTarget}</label>
                  <select
                    className={styles.input}
                    value={selectedHotspot.targetScreenId || ""}
                    onChange={(e) =>
                      handleUpdateHotspot(selectedHotspotId!, {
                        targetScreenId: e.target.value || null,
                      })
                    }
                  >
                    <option value="">{labels.noTarget}</option>
                    {nodes
                      .filter((n) => n.id !== selectedNodeId)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.data.title || n.data.key}
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDeleteHotspot(selectedHotspotId!)}
                >
                  {labels.deleteHotspot}
                </button>
              </div>
            ) : (
              <p className={styles.emptyText}>{labels.propertiesHint}</p>
            )}
          </aside>
        </div>
      </div>
      {previewImage ? (
        <div
          className={styles.previewOverlay}
          role="presentation"
          onClick={closeImagePreview}
        >
          <div
            className={styles.previewDialog}
            role="dialog"
            aria-modal="true"
            aria-label={previewImage.title}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.previewCloseButton}
              onClick={closeImagePreview}
              aria-label={labels.closePreview}
              title={labels.closePreview}
            >
              <svg
                className={styles.previewCloseIcon}
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M5 5L15 15" />
                <path d="M15 5L5 15" />
              </svg>
            </button>
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className={styles.previewImage}
            />
            <p className={styles.previewTitle}>{previewImage.title}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SimulationEditor(props: SimulationEditorProps) {
  return (
    <ReactFlowProvider>
      <SimulationEditorInner {...props} />
    </ReactFlowProvider>
  );
}
