"use client";

import { useCallback, useState, useMemo, useEffect, useRef } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  ScreenNode,
  type ScreenNodeData,
  type HotspotData,
  type HotspotDrawHandler,
} from "./canvas/ScreenNode";
import type { SimulationNode, SimulationEdge, EditorMode } from "./types";
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
  fetchCurrentSimulationDraftRemote,
  fetchSimulationMediaAppBindingsRemote,
  saveCurrentSimulationDraftRemote,
  fetchSimulationMediaAssetsRemote,
  resolveSimulationStoreAppRemote,
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

function findNodeIdAtPoint(
  clientX: number,
  clientY: number,
  sourceNodeId: string,
): string | null {
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
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  });
  return hit?.dataset.id ?? null;
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
  courseId?: string | null;
};

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

function SimulationEditorInner({
  language,
  scopeLabel,
  scopeKey,
  courseId,
}: SimulationEditorProps) {
  const [nodes, setNodes] = useState<SimulationNode[]>([]);
  const [edges, setEdges] = useState<SimulationEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(
    null,
  );
  const [mode, setMode] = useState<EditorMode>("select");
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
  const [editingHint, setEditingHint] = useState<{
    hotspotId: string;
    nodeId: string;
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

  const { fitView, screenToFlowPosition } = useReactFlow();

  const draggingHotspotRef = useRef(draggingHotspot);
  draggingHotspotRef.current = draggingHotspot;

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

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
      minSupportedVersion: modalTargetApp.minSupportedVersion.trim(),
      maxSupportedVersion: modalTargetApp.maxSupportedVersion.trim(),
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
    const min = parseSemver(modalMediaBinding.minSupportedVersion);
    const max = parseSemver(modalMediaBinding.maxSupportedVersion);
    if (!min || !max || compareSemver(min, max) > 0) {
      return language === "ru"
        ? "Проверьте диапазон версий (формат X.Y.Z, min <= max)."
        : "Check version range (X.Y.Z format, min <= max).";
    }
    if (!isValidReleaseDate(modalMediaBinding.releasedAt)) {
      return language === "ru"
        ? "Дата релиза должна быть в формате YYYY-MM-DD."
        : "Release date must use YYYY-MM-DD format.";
    }
    return null;
  }, [
    language,
    modalMediaBinding.maxSupportedVersion,
    modalMediaBinding.minSupportedVersion,
    modalMediaBinding.releasedAt,
    modalTargetApp.appName,
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
          const sorted = [...updated].sort(
            (a, b) =>
              a.position.x - b.position.x || a.position.y - b.position.y,
          );
          const firstId = sorted[0].id;
          const lastId = sorted[sorted.length - 1].id;
          return updated.map((node) => ({
            ...node,
            data: {
              ...node.data,
              isStart: node.id === firstId,
              isCompletion: updated.length > 1 && node.id === lastId,
            },
          }));
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
            modeSelect: "Выбор",
            modeDraw: "Рисование зон",
            screenTitle: "Название экрана",
            screenImage: "Изображение",
            removeImage: "Удалить",
            startScreen: "Начальный экран",
            endScreen: "Финальный экран",
            hotspotsTitle: "Зоны перехода",
            noHotspots: "Включите режим рисования для добавления зон",
            hotspotLabel: "Название",
            hotspotHint: "Подсказка",
            hotspotTarget: "Целевой экран",
            noTarget: "-- Не выбрано --",
            deleteHotspot: "Удалить зону",
            deleteScreen: "Удалить экран",
            backToMenu: "Назад",
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
            modeSelect: "Select",
            modeDraw: "Draw zones",
            screenTitle: "Screen title",
            screenImage: "Image",
            removeImage: "Remove",
            startScreen: "Start screen",
            endScreen: "End screen",
            hotspotsTitle: "Hotspots",
            noHotspots: "Enable draw mode to add hotspots",
            hotspotLabel: "Label",
            hotspotHint: "Hint",
            hotspotTarget: "Target screen",
            noTarget: "-- None --",
            deleteHotspot: "Delete hotspot",
            deleteScreen: "Delete screen",
            backToMenu: "Back",
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
    const sorted = [...updatedNodes].sort(
      (a, b) => a.position.x - b.position.x || a.position.y - b.position.y,
    );
    const firstId = sorted[0].id;
    const lastId = sorted[sorted.length - 1].id;

    const finalNodes = updatedNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        isStart: node.id === firstId,
        isCompletion: updatedNodes.length > 1 && node.id === lastId,
      },
    }));

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
        const sorted = [...updatedNodes].sort(
          (a, b) => a.position.x - b.position.x || a.position.y - b.position.y,
        );
        const firstId = sorted[0].id;
        const lastId = sorted[sorted.length - 1].id;

        return updatedNodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            isStart: node.id === firstId,
            isCompletion: updatedNodes.length > 1 && node.id === lastId,
          },
        }));
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

  const handleScreenAddFromAsset = useCallback(
    (asset: MediaAsset) => {
      handleAddAppScreen(mapMediaAssetToAppScreen(asset));
    },
    [handleAddAppScreen],
  );

  const handleModalScreenAdd = useCallback(
    (asset: MediaAsset) => {
      setTargetApp(modalTargetApp);
      handleAddAppScreen(mapMediaAssetToAppScreen(asset));
    },
    [handleAddAppScreen, modalTargetApp],
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
        event.dataTransfer.types.includes("application/x-simulation-screen")
      ) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }
    },
    [],
  );

  const handleCanvasDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
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
    [handleAddAppScreen, screenToFlowPosition],
  );

  const handleDrawHotspot: HotspotDrawHandler = useCallback(
    (hotspotData) => {
      if (!selectedNodeId) return;
      const newHotspot: HotspotData = {
        id: `hotspot-${Date.now()}`,
        label: "",
        hint: "",
        ...hotspotData,
        targetScreenId: null,
      };
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNodeId
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
      setSelectedHotspotId(newHotspot.id);
      setMode("select");
    },
    [selectedNodeId],
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

  const handleHotspotDragStart = useCallback(
    (
      hotspotId: string,
      sourceNodeId: string,
      startX: number,
      startY: number,
    ) => {
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

  useEffect(() => {
    if (!draggingHotspot) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!draggingHotspotRef.current) return;
      const current = draggingHotspotRef.current;
      const dx = e.clientX - current.startX;
      const dy = e.clientY - current.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Start actual drag after moving > 5px
      if (distance > 5) {
        setDraggingHotspot((prev) =>
          prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null,
        );
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const current = draggingHotspotRef.current;
      if (!current) return;

      const dx = e.clientX - current.startX;
      const dy = e.clientY - current.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If moved <= 5px, it's a click
      if (distance <= 5) {
        const node = nodesRef.current.find(
          (n) => n.id === current.sourceNodeId,
        );
        const hotspot = node?.data.hotspots.find(
          (h) => h.id === current.hotspotId,
        );
        if (node && hotspot) {
          const nodeElement = document.querySelector(
            `[data-id="${current.sourceNodeId}"]`,
          );
          if (nodeElement) {
            const rect = nodeElement.getBoundingClientRect();
            const hotspotX =
              rect.left +
              (hotspot.x / 100) * rect.width +
              (hotspot.width / 200) * rect.width;
            const hotspotY =
              rect.top +
              (hotspot.y / 100) * rect.height +
              (hotspot.height / 200) * rect.height;
            setEditingHint({
              hotspotId: current.hotspotId,
              nodeId: current.sourceNodeId,
              x: hotspotX,
              y: hotspotY,
            });
          }
          setSelectedHotspotId(current.hotspotId);
        }
        setDraggingHotspot(null);
        return;
      }

      // It's a drag - find target
      const targetNodeId = findNodeIdAtPoint(
        e.clientX,
        e.clientY,
        current.sourceNodeId,
      );
      if (targetNodeId && targetNodeId !== current.sourceNodeId) {
        // Check if edge already exists
        const existingEdge = edges.find(
          (edge) =>
            edge.source === current.sourceNodeId &&
            edge.target === targetNodeId,
        );
        if (!existingEdge) {
          const newEdge: SimulationEdge = {
            id: `edge-${current.sourceNodeId}-${targetNodeId}-${Date.now()}`,
            source: current.sourceNodeId,
            target: targetNodeId,
            type: "transition",
            data: {
              label: "",
              hotspotId: current.hotspotId,
            },
          };
          setEdges((eds) => [...eds, newEdge]);
        }
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id !== current.sourceNodeId) return node;
            return {
              ...node,
              data: {
                ...node.data,
                hotspots: node.data.hotspots.map((h) =>
                  h.id === current.hotspotId
                    ? { ...h, targetScreenId: targetNodeId }
                    : h,
                ),
              },
            };
          }),
        );
      } else {
        setDropHint({
          message:
            language === "ru"
              ? "Отпустите на экране для создания связи"
              : "Drop on a screen to create connection",
          x: e.clientX,
          y: e.clientY - 40,
        });
        setTimeout(() => setDropHint(null), 2000);
      }

      setDraggingHotspot(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggingHotspot, edges, language]);

  const nodesWithMode = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      mode,
      onDrawHotspot: handleDrawHotspot,
      onHotspotDragStart: handleHotspotDragStart,
      selectedHotspotId,
      nodeId: node.id,
      language,
    },
  }));

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedHotspot = selectedNode?.data.hotspots.find(
    (h) => h.id === selectedHotspotId,
  );
  const oldEditorHref = courseId
    ? `/simulation?lang=${language}&courseId=${encodeURIComponent(courseId)}`
    : `/simulation?lang=${language}`;

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
      onModalScreenAdd={handleModalScreenAdd}
      onModalScreenDragStart={handleModalScreenDragStart}
    />
  );

  const handleLoadDraft = useCallback(
    (draft: SimulationDraft) => {
      setTitle(draft.title);
      setTargetApp(draft.targetApp ?? defaultTargetApp);
      const { nodes: loadedNodes, edges: loadedEdges } =
        draftToNodesEdges(draft);
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      setSelectedNodeId(null);
      setTimeout(() => fitView({ padding: 0.2 }), 50);
    },
    [fitView],
  );

  const libraryTab = (
    <LibraryTab
      language={language}
      scopeKey={scopeKey}
      onLoadDraft={handleLoadDraft}
    />
  );

  return (
    <div className={styles.container}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <a href={`/dashboard?lang=${language}`} className={styles.backButton}>
            ← {labels.backToMenu}
          </a>
          <a href={oldEditorHref} className={styles.oldEditorLink}>
            {language === "ru" ? "Старый редактор" : "Old Editor"}
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
            className={`${styles.buttonSecondary} ${mode === "draw" ? styles.buttonActive : ""}`}
            onClick={() => setMode(mode === "draw" ? "select" : "draw")}
            disabled={isLoading}
          >
            {labels.modeDraw}
          </button>
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
        <aside className={styles.sidebar}>
          <ToolsPanel
            language={language}
            screensTab={screensTab}
            appMediaTab={appMediaTab}
            libraryTab={libraryTab}
          />
        </aside>

        <div
          className={styles.canvas}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
        >
          <ReactFlow
            nodes={nodesWithMode}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
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
              <div className={styles.helpText}>
                {mode === "draw"
                  ? language === "ru"
                    ? "Рисуйте зоны на выбранном экране"
                    : "Draw hotspots on selected screen"
                  : language === "ru"
                    ? "Тяните зону к другому экрану для связи"
                    : "Drag hotspot to another screen to connect"}
              </div>
            </Panel>
          </ReactFlow>

          {draggingHotspot && (
            <svg className={styles.dragLine}>
              <line
                x1={draggingHotspot.startX}
                y1={draggingHotspot.startY}
                x2={draggingHotspot.currentX}
                y2={draggingHotspot.currentY}
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
              <circle
                cx={draggingHotspot.startX}
                cy={draggingHotspot.startY}
                r={6}
                fill="#10b981"
              />
            </svg>
          )}

          {dropHint && (
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

          {editingHint &&
            (() => {
              const node = nodes.find((n) => n.id === editingHint.nodeId);
              const hotspot = node?.data.hotspots.find(
                (h) => h.id === editingHint.hotspotId,
              );
              if (!hotspot) return null;
              return (
                <div
                  className={styles.hintInputPopup}
                  style={{
                    left: editingHint.x,
                    top: editingHint.y,
                  }}
                >
                  <input
                    type="text"
                    className={styles.hintInput}
                    placeholder={language === "ru" ? "Подсказка..." : "Hint..."}
                    value={hotspot.hint}
                    autoFocus
                    onChange={(e) => {
                      setNodes((nds) =>
                        nds.map((n) =>
                          n.id === editingHint.nodeId
                            ? {
                                ...n,
                                data: {
                                  ...n.data,
                                  hotspots: n.data.hotspots.map((h) =>
                                    h.id === editingHint.hotspotId
                                      ? { ...h, hint: e.target.value }
                                      : h,
                                  ),
                                },
                              }
                            : n,
                        ),
                      );
                    }}
                    onBlur={() => setEditingHint(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") {
                        setEditingHint(null);
                      }
                    }}
                  />
                </div>
              );
            })()}
        </div>

        <aside className={styles.properties}>
          <h3 className={styles.propertiesTitle}>{labels.propertiesTitle}</h3>
          {selectedNode ? (
            <div className={styles.propertiesContent}>
              <div className={styles.field}>
                <label className={styles.label}>{labels.screenTitle}</label>
                <input
                  type="text"
                  className={styles.input}
                  value={selectedNode.data.title}
                  onChange={(e) =>
                    setNodes((nds) =>
                      nds.map((n) =>
                        n.id === selectedNodeId
                          ? { ...n, data: { ...n.data, title: e.target.value } }
                          : n,
                      ),
                    )
                  }
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{labels.screenImage}</label>
                {selectedNode.data.imageUrl ? (
                  <div className={styles.imagePreview}>
                    <img
                      src={selectedNode.data.imageUrl}
                      alt=""
                      className={styles.previewImg}
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
                      >
                        <img src={screen.imageUrl} alt={screen.title} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.screenFlags}>
                {selectedNode.data.isStart && (
                  <span className={styles.flagStart}>{labels.startScreen}</span>
                )}
                {selectedNode.data.isCompletion && (
                  <span className={styles.flagEnd}>{labels.endScreen}</span>
                )}
              </div>
              <div className={styles.hotspots}>
                <h4 className={styles.hotspotsTitle}>
                  {labels.hotspotsTitle} ({selectedNode.data.hotspots.length})
                </h4>
                {selectedNode.data.hotspots.length === 0 ? (
                  <p className={styles.noHotspots}>{labels.noHotspots}</p>
                ) : (
                  <ul className={styles.hotspotList}>
                    {selectedNode.data.hotspots.map((h) => (
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
              <div className={styles.hotspotCoords}>
                <span>x: {selectedHotspot.x.toFixed(1)}%</span>
                <span>y: {selectedHotspot.y.toFixed(1)}%</span>
                <span>w: {selectedHotspot.width.toFixed(1)}%</span>
                <span>h: {selectedHotspot.height.toFixed(1)}%</span>
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
  );
}

export function SimulationEditor(props: SimulationEditorProps) {
  return (
    <ReactFlowProvider>
      <SimulationEditorInner {...props} />
    </ReactFlowProvider>
  );
}
