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
import { AppScreensTab } from "./panels/AppScreensTab";
import { LibraryTab } from "./panels/LibraryTab";
import { MediaTab } from "./panels/MediaTab";
import type { AppScreen } from "./types";
import {
  createSimulationDraftFromPreset,
  type SimulationPresetId,
} from "@/features/simulation/model/factories";
import type { SimulationDraft } from "@/features/simulation/model/types";
import {
  fetchCurrentSimulationDraftRemote,
  saveCurrentSimulationDraftRemote,
  fetchSimulationMediaAssetsRemote,
  uploadSimulationMediaAssetRemote,
  type SimulationMediaAsset,
} from "@/features/simulation/api/client";
import styles from "./SimulationEditor.module.css";

const nodeTypes = {
  screen: ScreenNode,
};

const defaultEdgeOptions = {
  type: "transition",
  animated: false,
  style: { stroke: "#3b82f6", strokeWidth: 2 },
};

const defaultMediaBinding = {
  appPackageName: "com.example.app",
  storeType: "other" as const,
  minSupportedVersion: "1.0.0",
  maxSupportedVersion: "99.99.99",
  releasedAt: "",
};

type MediaAsset = {
  id: string;
  filename: string;
  url: string;
  uploadedAt: string;
};

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
  edges: SimulationEdge[],
  title: string,
  existingDraft: SimulationDraft | null,
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
    targetApp: existingDraft?.targetApp || {
      appName: "App",
      packageName: "com.example.app",
      storeType: "other",
      storeUrl: "",
      iconUrl: "",
      minSupportedVersion: "1.0.0",
      maxSupportedVersion: "1.0.0",
      releasedAt: "",
    },
    startScreenId,
    screens,
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
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [appScreens, setAppScreens] = useState<AppScreen[]>([]);
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [loadedDraft, setLoadedDraft] = useState<SimulationDraft | null>(null);

  const { fitView, screenToFlowPosition, getNodes } = useReactFlow();

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
          setLoadedDraft(draft);
          setTitle(draft.title);
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

  useEffect(() => {
    let mounted = true;
    async function loadMedia() {
      try {
        const assets = await fetchSimulationMediaAssetsRemote(
          scopeKey,
          "",
          defaultMediaBinding,
        );
        if (!mounted) return;
        const mapped: MediaAsset[] = assets.map((a) => ({
          id: a.id,
          filename: a.originalFilename,
          url: a.fileUrl,
          uploadedAt: a.createdAt,
        }));
        setMediaAssets(mapped);
        const appScreensMapped: AppScreen[] = assets.map((a) => ({
          id: a.id,
          key: a.originalFilename.replace(/\.[^/.]+$/, ""),
          title: a.originalFilename.replace(/\.[^/.]+$/, ""),
          imageUrl: a.fileUrl,
          createdAt: a.createdAt,
          updatedAt: a.createdAt,
        }));
        setAppScreens(appScreensMapped);
      } catch (error) {
        console.error("Failed to load media:", error);
      }
    }
    loadMedia();
    return () => {
      mounted = false;
    };
  }, [scopeKey]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const draft = nodesEdgesToDraft(nodes, edges, title, loadedDraft);
      const saved = await saveCurrentSimulationDraftRemote(draft, scopeKey);
      if (saved) {
        setLoadedDraft(saved);
        setLastSavedAt(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error("Failed to save draft:", error);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, title, loadedDraft, scopeKey, isSaving]);

  const handleExport = useCallback(() => {
    const draft = nodesEdgesToDraft(nodes, edges, title, loadedDraft);
    const json = JSON.stringify(draft, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "simulation"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, title, loadedDraft]);

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
          return updated.map((node, index) => ({
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

  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    setSelectedEdgeId(null);
  }, []);

  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleAddAppScreen = useCallback(
    (appScreen: AppScreen) => {
      const newId = `screen-${Date.now()}`;
      const newNode: SimulationNode = {
        id: newId,
        type: "screen",
        position: {
          x: 50 + (nodes.length % 4) * 250,
          y: 50 + Math.floor(nodes.length / 4) * 400,
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
    },
    [nodes],
  );

  const handleApplyPreset = useCallback(
    (presetId: SimulationPresetId) => {
      const draft = createSimulationDraftFromPreset(presetId, language);
      setTitle(draft.title);

      const newNodes: SimulationNode[] = draft.screens.map((screen, index) => ({
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

      const newEdges: SimulationEdge[] = [];
      draft.screens.forEach((screen) => {
        screen.hotspots.forEach((hotspot, index) => {
          if (hotspot.targetScreenId) {
            newEdges.push({
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

      setNodes(newNodes);
      setEdges(newEdges);
      setSelectedNodeId(null);

      setTimeout(() => fitView({ padding: 0.2 }), 50);
    },
    [language, fitView],
  );

  const handleUploadMedia = useCallback(
    async (file: File) => {
      try {
        const asset = await uploadSimulationMediaAssetRemote(
          scopeKey,
          file,
          defaultMediaBinding,
        );
        const mapped: MediaAsset = {
          id: asset.id,
          filename: asset.originalFilename,
          url: asset.fileUrl,
          uploadedAt: asset.createdAt,
        };
        setMediaAssets((assets) => [mapped, ...assets]);
      } catch (error) {
        console.error("Failed to upload media:", error);
      }
    },
    [scopeKey],
  );

  const handleSelectMedia = useCallback(
    (asset: MediaAsset) => {
      if (selectedNodeId) {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === selectedNodeId
              ? { ...node, data: { ...node.data, imageUrl: asset.url } }
              : node,
          ),
        );
      }
    },
    [selectedNodeId],
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
      console.log("🚀 HOTSPOT DOWN:", hotspotId, sourceNodeId, startX, startY);
      const newDragging = {
        hotspotId,
        sourceNodeId,
        startX,
        startY,
        currentX: startX,
        currentY: startY,
      };
      console.log("🚀 Setting draggingHotspot:", newDragging);
      draggingHotspotRef.current = newDragging;
      setDraggingHotspot(newDragging);
    },
    [],
  );

  useEffect(() => {
    console.log("📡 useEffect running, draggingHotspot:", draggingHotspot);
    if (!draggingHotspot) return;

    const handlePointerMove = (e: PointerEvent) => {
      console.log("📍 pointermove, current:", draggingHotspotRef.current);
      if (!draggingHotspotRef.current) return;
      const current = draggingHotspotRef.current;
      const dx = e.clientX - current.startX;
      const dy = e.clientY - current.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      console.log("📍 pointermove, distance:", distance);

      // Start actual drag after moving > 5px
      if (distance > 5) {
        setDraggingHotspot((prev) =>
          prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null,
        );
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const current = draggingHotspotRef.current;
      console.log("📍 pointerup, current:", current);
      if (!current) return;

      const dx = e.clientX - current.startX;
      const dy = e.clientY - current.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      console.log("📍 pointerup, distance:", distance);

      // If moved <= 5px, it's a click
      if (distance <= 5) {
        console.log(
          "📍 CLICK detected, nodesRef has:",
          nodesRef.current.length,
          "nodes",
        );
        const node = nodesRef.current.find(
          (n) => n.id === current.sourceNodeId,
        );
        console.log(
          "📍 Found node:",
          node?.id,
          "hotspots:",
          node?.data.hotspots.length,
        );
        const hotspot = node?.data.hotspots.find(
          (h) => h.id === current.hotspotId,
        );
        console.log("📍 Found hotspot:", hotspot?.id);
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
      const target = document.elementFromPoint(e.clientX, e.clientY);
      console.log("📍 Target element:", target);

      let targetNodeId: string | null = null;

      const nodeElement = target?.closest("[data-id]");
      console.log("📍 Node element:", nodeElement);
      if (nodeElement) {
        targetNodeId = nodeElement.getAttribute("data-id");
      }
      console.log("📍 Target node id from element:", targetNodeId);

      if (!targetNodeId) {
        const flowPosition = screenToFlowPosition({
          x: e.clientX,
          y: e.clientY,
        });
        console.log("📍 Flow position:", flowPosition);
        const allNodes = getNodes();
        const nodeUnderPoint = allNodes.find((node) => {
          const nodeWidth = 200;
          const nodeHeight = nodeWidth / (9 / 16) + 40;
          return (
            flowPosition.x >= node.position.x &&
            flowPosition.x <= node.position.x + nodeWidth &&
            flowPosition.y >= node.position.y &&
            flowPosition.y <= node.position.y + nodeHeight
          );
        });
        console.log("📍 Node under point:", nodeUnderPoint?.id);
        if (nodeUnderPoint) {
          targetNodeId = nodeUnderPoint.id;
        }
      }

      console.log(
        "📍 Final targetNodeId:",
        targetNodeId,
        "sourceNodeId:",
        current.sourceNodeId,
      );
      if (targetNodeId && targetNodeId !== current.sourceNodeId) {
        console.log("📍 CREATING CONNECTION!");
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
  }, [draggingHotspot, screenToFlowPosition, getNodes, language]);

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
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);
  const selectedHotspot = selectedNode?.data.hotspots.find(
    (h) => h.id === selectedHotspotId,
  );

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

  const appScreensTab = (
    <AppScreensTab
      language={language}
      screens={appScreens}
      onAddScreen={handleAddAppScreen}
    />
  );

  const handleLoadDraft = useCallback(
    (draft: SimulationDraft) => {
      setLoadedDraft(draft);
      setTitle(draft.title);
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

  const mediaTab = (
    <MediaTab
      language={language}
      assets={mediaAssets}
      onUpload={handleUploadMedia}
      onSelect={handleSelectMedia}
    />
  );

  return (
    <div className={styles.container}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <a href={`/?lang=${language}`} className={styles.backButton}>
            ← {labels.backToMenu}
          </a>
          <a href="/simulation" className={styles.oldEditorLink}>
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
            appScreensTab={appScreensTab}
            libraryTab={libraryTab}
            mediaTab={mediaTab}
          />
        </aside>

        <div className={styles.canvas}>
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
