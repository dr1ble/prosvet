"use client";

import { memo, useState, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { type Node, type NodeProps } from "@xyflow/react";
import styles from "./ScreenNode.module.css";

export interface HotspotData {
  id: string;
  label: string;
  hint: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetScreenId: string | null;
}

export type HotspotDrawHandler = (
  nodeId: string,
  hotspot: Omit<HotspotData, "id" | "label" | "hint" | "targetScreenId">,
) => void;

export type HotspotChangeHandler = (
  hotspotId: string,
  nodeId: string,
  updates: Partial<Pick<HotspotData, "x" | "y" | "width" | "height">>,
) => void;

export type HotspotDragStartHandler = (
  hotspotId: string,
  nodeId: string,
  startX: number,
  startY: number,
) => void;

export type HotspotSelectHandler = (hotspotId: string, nodeId: string) => void;

export type ScreenSelectHandler = (nodeId: string) => void;

export interface ScreenNodeData extends Record<string, unknown> {
  key: string;
  title: string;
  imageUrl: string;
  isCompletion: boolean;
  isStart: boolean;
  hotspots: HotspotData[];
  onDrawHotspot?: HotspotDrawHandler;
  onHotspotChange?: HotspotChangeHandler;
  onHotspotDragStart?: HotspotDragStartHandler;
  onHotspotSelect?: HotspotSelectHandler;
  onScreenSelect?: ScreenSelectHandler;
  language?: "ru" | "en";
  nodeId?: string;
  selectedHotspotId?: string | null;
}

export type ScreenNodeType = Node<ScreenNodeData, "screen">;

type ScreenNodeProps = NodeProps<ScreenNodeType>;

type PercentPoint = {
  x: number;
  y: number;
};

type HotspotGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ResizeHandleId = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
type ResizeGuideSide = "top" | "right" | "bottom" | "left";
type ResizeCornerGuide = Extract<ResizeHandleId, "nw" | "ne" | "se" | "sw">;

type InteractionState =
  | {
      kind: "move";
      pointerId: number;
      hotspotId: string;
      startPointerClient: { x: number; y: number };
      startPointerPercent: PercentPoint;
      initialRect: HotspotGeometry;
      hasMoved: boolean;
    }
  | {
      kind: "resize";
      pointerId: number;
      hotspotId: string;
      handle: ResizeHandleId;
      startPointerClient: { x: number; y: number };
      startPointerPercent: PercentPoint;
      initialRect: HotspotGeometry;
      hasResized: boolean;
    };

const SCREEN_WIDTH = 200;
const DEFAULT_ASPECT_RATIO = 9 / 16;
const MIN_HOTSPOT_SIZE_PX = 2;
const RESIZE_EDGE_THRESHOLD_PX = 8;
const GESTURE_START_THRESHOLD_PX = 3;

function cursorForResizeHandle(handle: ResizeHandleId): string {
  switch (handle) {
    case "n":
    case "s":
      return "ns-resize";
    case "e":
    case "w":
      return "ew-resize";
    case "ne":
    case "sw":
      return "nesw-resize";
    case "nw":
    case "se":
      return "nwse-resize";
    default:
      return "crosshair";
  }
}

function resolveResizeGuideSides(handle: ResizeHandleId): ResizeGuideSide[] {
  if (handle.length === 2) {
    return [];
  }
  const sides: ResizeGuideSide[] = [];
  if (handle.includes("n")) sides.push("top");
  if (handle.includes("e")) sides.push("right");
  if (handle.includes("s")) sides.push("bottom");
  if (handle.includes("w")) sides.push("left");
  return sides;
}

function resolveResizeCornerGuide(
  handle: ResizeHandleId,
): ResizeCornerGuide | null {
  return handle.length === 2 ? (handle as ResizeCornerGuide) : null;
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildRectFromPoints(
  start: PercentPoint,
  current: PercentPoint,
): HotspotGeometry {
  return {
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  };
}

function clampRectToBounds(rect: HotspotGeometry): HotspotGeometry {
  const width = clampValue(rect.width, 0, 100);
  const height = clampValue(rect.height, 0, 100);
  return {
    x: clampValue(rect.x, 0, 100 - width),
    y: clampValue(rect.y, 0, 100 - height),
    width,
    height,
  };
}

function normalizeEdgeFlags(
  nearStart: boolean,
  nearEnd: boolean,
  coordinate: number,
  size: number,
): { start: boolean; end: boolean } {
  if (nearStart && nearEnd) {
    const isStartSide = coordinate <= size / 2;
    return { start: isStartSide, end: !isStartSide };
  }
  return { start: nearStart, end: nearEnd };
}

function detectResizeHandle(
  localX: number,
  localY: number,
  width: number,
  height: number,
): ResizeHandleId | null {
  if (width <= 0 || height <= 0) {
    return null;
  }
  const nearLeftRaw = localX <= RESIZE_EDGE_THRESHOLD_PX;
  const nearRightRaw = width - localX <= RESIZE_EDGE_THRESHOLD_PX;
  const nearTopRaw = localY <= RESIZE_EDGE_THRESHOLD_PX;
  const nearBottomRaw = height - localY <= RESIZE_EDGE_THRESHOLD_PX;

  const horizontal = normalizeEdgeFlags(
    nearLeftRaw,
    nearRightRaw,
    localX,
    width,
  );
  const vertical = normalizeEdgeFlags(
    nearTopRaw,
    nearBottomRaw,
    localY,
    height,
  );

  const nearLeft = horizontal.start;
  const nearRight = horizontal.end;
  const nearTop = vertical.start;
  const nearBottom = vertical.end;

  if (nearTop && nearLeft) return "nw";
  if (nearTop && nearRight) return "ne";
  if (nearBottom && nearLeft) return "sw";
  if (nearBottom && nearRight) return "se";
  if (nearTop) return "n";
  if (nearBottom) return "s";
  if (nearLeft) return "w";
  if (nearRight) return "e";
  return null;
}

function applyResize(
  initial: HotspotGeometry,
  handle: ResizeHandleId,
  delta: PercentPoint,
  minSizePercent: { width: number; height: number },
): HotspotGeometry {
  let left = initial.x;
  let right = initial.x + initial.width;
  let top = initial.y;
  let bottom = initial.y + initial.height;

  if (handle.includes("w")) {
    left += delta.x;
  }
  if (handle.includes("e")) {
    right += delta.x;
  }
  if (handle.includes("n")) {
    top += delta.y;
  }
  if (handle.includes("s")) {
    bottom += delta.y;
  }

  if (right - left < minSizePercent.width) {
    if (handle.includes("w")) {
      left = right - minSizePercent.width;
    } else {
      right = left + minSizePercent.width;
    }
  }

  if (bottom - top < minSizePercent.height) {
    if (handle.includes("n")) {
      top = bottom - minSizePercent.height;
    } else {
      bottom = top + minSizePercent.height;
    }
  }

  if (left < 0) {
    if (handle.includes("w")) {
      left = 0;
    } else {
      const shift = -left;
      left += shift;
      right += shift;
    }
  }

  if (right > 100) {
    if (handle.includes("e")) {
      right = 100;
    } else {
      const shift = right - 100;
      left -= shift;
      right -= shift;
    }
  }

  if (top < 0) {
    if (handle.includes("n")) {
      top = 0;
    } else {
      const shift = -top;
      top += shift;
      bottom += shift;
    }
  }

  if (bottom > 100) {
    if (handle.includes("s")) {
      bottom = 100;
    } else {
      const shift = bottom - 100;
      top -= shift;
      bottom -= shift;
    }
  }

  if (right - left < minSizePercent.width) {
    right = clampValue(left + minSizePercent.width, minSizePercent.width, 100);
    left = right - minSizePercent.width;
  }

  if (bottom - top < minSizePercent.height) {
    bottom = clampValue(
      top + minSizePercent.height,
      minSizePercent.height,
      100,
    );
    top = bottom - minSizePercent.height;
  }

  return {
    x: clampValue(left, 0, 100 - minSizePercent.width),
    y: clampValue(top, 0, 100 - minSizePercent.height),
    width: clampValue(right - left, minSizePercent.width, 100),
    height: clampValue(bottom - top, minSizePercent.height, 100),
  };
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest('[data-hotspot-interactive="true"]') !== null
  );
}

function ScreenNodeComponent({ data, selected, id }: ScreenNodeProps) {
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<InteractionState | null>(null);

  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [hotspotResizeCursor, setHotspotResizeCursor] = useState<{
    hotspotId: string;
    cursor: string;
    handle: ResizeHandleId;
  } | null>(null);
  const [hoveredGripHotspotId, setHoveredGripHotspotId] = useState<
    string | null
  >(null);
  const [createDraft, setCreateDraft] = useState<{
    pointerId: number;
    start: PercentPoint;
    current: PercentPoint;
  } | null>(null);

  const lang = data.language || "ru";

  const startLabel = lang === "ru" ? "Начало" : "Start";
  const endLabel = lang === "ru" ? "Финал" : "End";

  const imageUnavailable = Boolean(
    data.imageUrl && failedImageUrl === data.imageUrl,
  );

  const effectiveAspectRatio =
    loadedImageUrl === data.imageUrl ? imageAspectRatio : null;
  const thumbnailHeight = useMemo(() => {
    const aspect =
      effectiveAspectRatio && effectiveAspectRatio > 0
        ? effectiveAspectRatio
        : DEFAULT_ASPECT_RATIO;
    return SCREEN_WIDTH / aspect;
  }, [effectiveAspectRatio]);

  const getRelativePosition = useCallback(
    (
      clientX: number,
      clientY: number,
      options?: { clamp?: boolean },
    ): PercentPoint | null => {
      if (!thumbnailRef.current) return null;
      const rect = thumbnailRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return null;
      }

      let localX = clientX - rect.left;
      let localY = clientY - rect.top;

      if (!(options?.clamp ?? false)) {
        const outside =
          localX < 0 ||
          localY < 0 ||
          localX > rect.width ||
          localY > rect.height;
        if (outside) {
          return null;
        }
      }

      localX = clampValue(localX, 0, rect.width);
      localY = clampValue(localY, 0, rect.height);

      return {
        x: (localX / rect.width) * 100,
        y: (localY / rect.height) * 100,
      };
    },
    [],
  );

  const getMinHotspotSizePercent = useCallback(() => {
    if (!thumbnailRef.current) {
      return { width: 0.2, height: 0.2 };
    }
    const rect = thumbnailRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return { width: 0.2, height: 0.2 };
    }
    return {
      width: (MIN_HOTSPOT_SIZE_PX / rect.width) * 100,
      height: (MIN_HOTSPOT_SIZE_PX / rect.height) * 100,
    };
  }, []);

  const applyHotspotGeometry = useCallback(
    (hotspotId: string, nextRect: HotspotGeometry) => {
      if (!data.nodeId || !data.onHotspotChange) {
        return;
      }
      data.onHotspotChange(hotspotId, data.nodeId, nextRect);
    },
    [data],
  );

  const releasePointerCapture = useCallback((event: React.PointerEvent) => {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.hasPointerCapture(event.pointerId)
    ) {
      target.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleThumbnailPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      if (!data.onDrawHotspot || !data.nodeId) return;
      if (isInteractiveTarget(event.target)) return;

      const start = getRelativePosition(event.clientX, event.clientY);
      if (!start) return;

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      data.onScreenSelect?.(data.nodeId);
      setCreateDraft({ pointerId: event.pointerId, start, current: start });
    },
    [data, getRelativePosition],
  );

  const handleThumbnailPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (createDraft && createDraft.pointerId === event.pointerId) {
        const current = getRelativePosition(event.clientX, event.clientY, {
          clamp: true,
        });
        if (!current) {
          return;
        }
        setCreateDraft((draft) =>
          draft && draft.pointerId === event.pointerId
            ? { ...draft, current }
            : draft,
        );
        return;
      }

      const interaction = interactionRef.current;
      if (!interaction || interaction.pointerId !== event.pointerId) {
        return;
      }

      const current = getRelativePosition(event.clientX, event.clientY, {
        clamp: true,
      });
      if (!current) {
        return;
      }

      const delta = {
        x: current.x - interaction.startPointerPercent.x,
        y: current.y - interaction.startPointerPercent.y,
      };
      const deltaClientX = event.clientX - interaction.startPointerClient.x;
      const deltaClientY = event.clientY - interaction.startPointerClient.y;
      const pointerTravel = Math.sqrt(
        deltaClientX * deltaClientX + deltaClientY * deltaClientY,
      );

      if (interaction.kind === "move") {
        if (
          !interaction.hasMoved &&
          pointerTravel < GESTURE_START_THRESHOLD_PX
        ) {
          return;
        }

        const nextRect = clampRectToBounds({
          x: interaction.initialRect.x + delta.x,
          y: interaction.initialRect.y + delta.y,
          width: interaction.initialRect.width,
          height: interaction.initialRect.height,
        });

        if (!interaction.hasMoved) {
          interaction.hasMoved = true;
          interactionRef.current = interaction;
        }

        applyHotspotGeometry(interaction.hotspotId, nextRect);

        return;
      }

      if (
        !interaction.hasResized &&
        pointerTravel < GESTURE_START_THRESHOLD_PX
      ) {
        return;
      }

      const minSizePercent = getMinHotspotSizePercent();
      const nextRect = applyResize(
        interaction.initialRect,
        interaction.handle,
        delta,
        minSizePercent,
      );

      if (!interaction.hasResized) {
        interaction.hasResized = true;
        interactionRef.current = interaction;
      }

      applyHotspotGeometry(interaction.hotspotId, nextRect);
    },
    [
      applyHotspotGeometry,
      createDraft,
      getMinHotspotSizePercent,
      getRelativePosition,
    ],
  );

  const handleThumbnailPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (createDraft && createDraft.pointerId === event.pointerId) {
        releasePointerCapture(event);

        const committedRect = buildRectFromPoints(
          createDraft.start,
          createDraft.current,
        );
        const minSizePercent = getMinHotspotSizePercent();
        if (
          committedRect.width >= minSizePercent.width &&
          committedRect.height >= minSizePercent.height &&
          data.onDrawHotspot &&
          data.nodeId
        ) {
          data.onDrawHotspot(data.nodeId, committedRect);
        }
        setCreateDraft(null);
        return;
      }

      const interaction = interactionRef.current;
      if (!interaction || interaction.pointerId !== event.pointerId) {
        return;
      }

      releasePointerCapture(event);
      interactionRef.current = null;
      if (interaction.kind === "resize") {
        setHotspotResizeCursor(null);
      }
    },
    [createDraft, data, getMinHotspotSizePercent, releasePointerCapture],
  );

  const handleThumbnailPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (createDraft && createDraft.pointerId === event.pointerId) {
        releasePointerCapture(event);
        setCreateDraft(null);
      }

      const interaction = interactionRef.current;
      if (interaction && interaction.pointerId === event.pointerId) {
        releasePointerCapture(event);
        interactionRef.current = null;
        if (interaction.kind === "resize") {
          setHotspotResizeCursor(null);
        }
      }
    },
    [createDraft, releasePointerCapture],
  );

  const startResizeInteraction = useCallback(
    (
      event: React.PointerEvent<HTMLElement>,
      hotspot: HotspotData,
      handle: ResizeHandleId,
    ) => {
      if (!data.nodeId) {
        return;
      }
      const startPoint = getRelativePosition(event.clientX, event.clientY, {
        clamp: true,
      });
      if (!startPoint) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      setHotspotResizeCursor({
        hotspotId: hotspot.id,
        cursor: cursorForResizeHandle(handle),
        handle,
      });
      interactionRef.current = {
        kind: "resize",
        pointerId: event.pointerId,
        hotspotId: hotspot.id,
        handle,
        startPointerClient: { x: event.clientX, y: event.clientY },
        startPointerPercent: startPoint,
        initialRect: {
          x: hotspot.x,
          y: hotspot.y,
          width: hotspot.width,
          height: hotspot.height,
        },
        hasResized: false,
      };
    },
    [data.nodeId, getRelativePosition],
  );

  const handleHotspotBodyPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, hotspot: HotspotData) => {
      if (event.button !== 0 || !data.nodeId) return;

      event.stopPropagation();
      event.preventDefault();
      data.onScreenSelect?.(data.nodeId);
      data.onHotspotSelect?.(hotspot.id, data.nodeId);

      const hotspotRect = event.currentTarget.getBoundingClientRect();
      const resizeHandle = detectResizeHandle(
        event.clientX - hotspotRect.left,
        event.clientY - hotspotRect.top,
        hotspotRect.width,
        hotspotRect.height,
      );
      const isSelectedHotspot = data.selectedHotspotId === hotspot.id;
      if (isSelectedHotspot && resizeHandle) {
        startResizeInteraction(event, hotspot, resizeHandle);
        return;
      }

      setHotspotResizeCursor(null);
      data.onHotspotDragStart?.(
        hotspot.id,
        data.nodeId,
        event.clientX,
        event.clientY,
      );
    },
    [data, startResizeInteraction],
  );

  const handleHotspotGripPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>, hotspot: HotspotData) => {
      if (event.button !== 0 || !data.nodeId) return;

      event.stopPropagation();
      event.preventDefault();
      data.onScreenSelect?.(data.nodeId);
      data.onHotspotSelect?.(hotspot.id, data.nodeId);

      const startPoint = getRelativePosition(event.clientX, event.clientY, {
        clamp: true,
      });
      if (!startPoint) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      setHotspotResizeCursor(null);

      interactionRef.current = {
        kind: "move",
        pointerId: event.pointerId,
        hotspotId: hotspot.id,
        startPointerClient: { x: event.clientX, y: event.clientY },
        startPointerPercent: startPoint,
        initialRect: {
          x: hotspot.x,
          y: hotspot.y,
          width: hotspot.width,
          height: hotspot.height,
        },
        hasMoved: false,
      };
    },
    [data, getRelativePosition],
  );

  const handleHotspotBodyPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, hotspot: HotspotData) => {
      const isSelectedHotspot = data.selectedHotspotId === hotspot.id;
      if (!isSelectedHotspot) {
        if (hotspotResizeCursor?.hotspotId === hotspot.id) {
          setHotspotResizeCursor(null);
        }
        return;
      }

      const hotspotRect = event.currentTarget.getBoundingClientRect();
      const resizeHandle = detectResizeHandle(
        event.clientX - hotspotRect.left,
        event.clientY - hotspotRect.top,
        hotspotRect.width,
        hotspotRect.height,
      );
      if (!resizeHandle) {
        if (hotspotResizeCursor?.hotspotId === hotspot.id) {
          setHotspotResizeCursor(null);
        }
        return;
      }

      const cursor = cursorForResizeHandle(resizeHandle);
      if (
        hotspotResizeCursor?.hotspotId !== hotspot.id ||
        hotspotResizeCursor.cursor !== cursor ||
        hotspotResizeCursor.handle !== resizeHandle
      ) {
        setHotspotResizeCursor({
          hotspotId: hotspot.id,
          cursor,
          handle: resizeHandle,
        });
      }
    },
    [data.selectedHotspotId, hotspotResizeCursor],
  );

  const handleHotspotBodyPointerLeave = useCallback((hotspotId: string) => {
    setHotspotResizeCursor((current) =>
      current?.hotspotId === hotspotId ? null : current,
    );
  }, []);

  const handleHotspotClick = useCallback(
    (event: React.MouseEvent, hotspot: HotspotData) => {
      event.stopPropagation();
      event.preventDefault();
      if (interactionRef.current) {
        return;
      }
      if (data.onHotspotSelect && data.nodeId) {
        data.onHotspotSelect(hotspot.id, data.nodeId);
      }
    },
    [data],
  );

  const drawRect =
    createDraft && buildRectFromPoints(createDraft.start, createDraft.current);

  return (
    <div
      className={`${styles.container} ${selected ? styles.selected : ""}`}
      style={{ width: SCREEN_WIDTH }}
      data-id={id}
    >
      <div className={styles.header}>
        <span className={styles.title}>
          {data.title || (lang === "ru" ? "Экран" : "Screen")}
        </span>
        {data.isStart && <span className={styles.badge}>{startLabel}</span>}
        {data.isCompletion && <span className={styles.badge}>{endLabel}</span>}
      </div>

      <div
        ref={thumbnailRef}
        className={styles.thumbnail}
        style={{ height: thumbnailHeight }}
        onPointerDown={handleThumbnailPointerDown}
        onPointerMove={handleThumbnailPointerMove}
        onPointerUp={handleThumbnailPointerUp}
        onPointerCancel={handleThumbnailPointerCancel}
      >
        {data.imageUrl && !imageUnavailable ? (
          <Image
            src={data.imageUrl}
            alt={data.title || "Screen"}
            className={styles.image}
            fill
            sizes="220px"
            unoptimized
            onError={() => {
              setFailedImageUrl(data.imageUrl);
              setLoadedImageUrl(null);
              setImageAspectRatio(null);
            }}
            onLoad={(event) => {
              const target = event.currentTarget;
              if (target.naturalWidth > 0 && target.naturalHeight > 0) {
                setLoadedImageUrl(data.imageUrl);
                setImageAspectRatio(target.naturalWidth / target.naturalHeight);
              }
            }}
          />
        ) : (
          <div className={styles.placeholder}>
            {data.imageUrl
              ? lang === "ru"
                ? "Изображение недоступно"
                : "Image unavailable"
              : lang === "ru"
                ? "Нет изображения"
                : "No image"}
          </div>
        )}

        <div className={styles.hotspotsOverlay}>
          {data.hotspots.map((hotspot) => {
            const isSelectedHotspot = data.selectedHotspotId === hotspot.id;
            const resizeIntentHandle =
              isSelectedHotspot && hotspotResizeCursor?.hotspotId === hotspot.id
                ? hotspotResizeCursor.handle
                : null;
            const shouldShowResizeGuides =
              Boolean(resizeIntentHandle) && hoveredGripHotspotId === null;
            const resizeGuideSides = resizeIntentHandle
              ? resolveResizeGuideSides(resizeIntentHandle)
              : [];
            const resizeCornerGuide = resizeIntentHandle
              ? resolveResizeCornerGuide(resizeIntentHandle)
              : null;
            return (
              <div
                key={hotspot.id}
                className={`${styles.hotspot} nodrag ${isSelectedHotspot ? styles.hotspotSelected : ""} ${hotspot.targetScreenId ? styles.hotspotConnected : ""}`}
                style={{
                  left: `${hotspot.x}%`,
                  top: `${hotspot.y}%`,
                  width: `${hotspot.width}%`,
                  height: `${hotspot.height}%`,
                  cursor:
                    isSelectedHotspot &&
                    hotspotResizeCursor?.hotspotId === hotspot.id
                      ? hotspotResizeCursor.cursor
                      : undefined,
                }}
                title={hotspot.label || hotspot.hint || "Hotspot"}
                data-hotspot-interactive="true"
                onPointerDown={(event) =>
                  handleHotspotBodyPointerDown(event, hotspot)
                }
                onPointerMove={(event) =>
                  handleHotspotBodyPointerMove(event, hotspot)
                }
                onPointerLeave={() => handleHotspotBodyPointerLeave(hotspot.id)}
                onClick={(event) => handleHotspotClick(event, hotspot)}
              >
                {isSelectedHotspot && (
                  <>
                    <button
                      type="button"
                      className={`${styles.hotspotGrip} nodrag nowheel`}
                      data-hotspot-interactive="true"
                      onPointerEnter={() => {
                        setHoveredGripHotspotId(hotspot.id);
                        setHotspotResizeCursor((current) =>
                          current?.hotspotId === hotspot.id ? null : current,
                        );
                      }}
                      onPointerLeave={() =>
                        setHoveredGripHotspotId((current) =>
                          current === hotspot.id ? null : current,
                        )
                      }
                      onPointerDown={(event) =>
                        handleHotspotGripPointerDown(event, hotspot)
                      }
                    >
                      <span className={styles.hotspotGripIcon} />
                    </button>
                    {shouldShowResizeGuides && resizeIntentHandle && (
                      <div className={styles.resizeGuides}>
                        {resizeGuideSides.map((side) => (
                          <span
                            key={`${hotspot.id}-guide-${side}`}
                            className={`${styles.resizeGuide} ${
                              side === "top"
                                ? styles.resizeGuideTop
                                : side === "right"
                                  ? styles.resizeGuideRight
                                  : side === "bottom"
                                    ? styles.resizeGuideBottom
                                    : styles.resizeGuideLeft
                            }`}
                          />
                        ))}
                        {resizeCornerGuide && (
                          <span
                            className={`${styles.resizeCornerGuide} ${
                              resizeCornerGuide === "nw"
                                ? styles.resizeCornerGuideNw
                                : resizeCornerGuide === "ne"
                                  ? styles.resizeCornerGuideNe
                                  : resizeCornerGuide === "se"
                                    ? styles.resizeCornerGuideSe
                                    : styles.resizeCornerGuideSw
                            }`}
                          />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {drawRect && (
            <div
              className={styles.drawHotspot}
              style={{
                left: `${drawRect.x}%`,
                top: `${drawRect.y}%`,
                width: `${drawRect.width}%`,
                height: `${drawRect.height}%`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export const ScreenNode = memo(ScreenNodeComponent);
