"use client";

import { memo, useState, useCallback, useRef } from "react";
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
  hotspot: Omit<HotspotData, "id" | "label" | "hint" | "targetScreenId">,
) => void;

export type HotspotDragStartHandler = (
  hotspotId: string,
  nodeId: string,
  startX: number,
  startY: number,
) => void;

export interface ScreenNodeData extends Record<string, unknown> {
  key: string;
  title: string;
  imageUrl: string;
  isCompletion: boolean;
  isStart: boolean;
  hotspots: HotspotData[];
  mode?: "select" | "draw";
  onDrawHotspot?: HotspotDrawHandler;
  onHotspotDragStart?: HotspotDragStartHandler;
  language?: "ru" | "en";
  nodeId?: string;
  selectedHotspotId?: string | null;
}

export type ScreenNodeType = Node<ScreenNodeData, "screen">;

type ScreenNodeProps = NodeProps<ScreenNodeType>;

const SCREEN_WIDTH = 200;

function ScreenNodeComponent({ data, selected, id }: ScreenNodeProps) {
  const aspectRatio = 9 / 16;
  const thumbnailHeight = SCREEN_WIDTH / aspectRatio;
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  const mode = data.mode || "select";
  const lang = data.language || "ru";

  const startLabel = lang === "ru" ? "Начало" : "Start";
  const endLabel = lang === "ru" ? "Финал" : "End";

  const imageUnavailable = Boolean(
    data.imageUrl && failedImageUrl === data.imageUrl,
  );

  const getRelativePosition = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!thumbnailRef.current) return { x: 0, y: 0 };
      const rect = thumbnailRef.current.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * 100,
        y: ((clientY - rect.top) / rect.height) * 100,
      };
    },
    [],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (mode !== "draw" || !selected) return;
      event.stopPropagation();
      event.preventDefault();
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
      const pos = getRelativePosition(event.clientX, event.clientY);
      setIsDrawing(true);
      setDrawStart(pos);
      setDrawCurrent(pos);
    },
    [mode, selected, getRelativePosition],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!isDrawing) return;
      const pos = getRelativePosition(event.clientX, event.clientY);
      setDrawCurrent(pos);
    },
    [isDrawing, getRelativePosition],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (!isDrawing) return;
      event.stopPropagation();
      (event.target as HTMLElement).releasePointerCapture(event.pointerId);
      setIsDrawing(false);

      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const width = Math.abs(drawCurrent.x - drawStart.x);
      const height = Math.abs(drawCurrent.y - drawStart.y);

      if (width > 2 && height > 2 && data.onDrawHotspot) {
        data.onDrawHotspot({ x, y, width, height });
      }
    },
    [isDrawing, drawStart, drawCurrent, data],
  );

  const handleHotspotPointerDown = useCallback(
    (event: React.PointerEvent, hotspot: HotspotData) => {
      event.stopPropagation();
      event.preventDefault();
      if (data.onHotspotDragStart && data.nodeId) {
        data.onHotspotDragStart(
          hotspot.id,
          data.nodeId,
          event.clientX,
          event.clientY,
        );
      }
    },
    [data],
  );

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
        className={`${styles.thumbnail} ${mode === "draw" && selected ? styles.drawMode : ""}`}
        style={{ height: thumbnailHeight }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {data.imageUrl && !imageUnavailable ? (
          <img
            src={data.imageUrl}
            alt={data.title || "Screen"}
            className={styles.image}
            onError={() => setFailedImageUrl(data.imageUrl)}
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

        {data.hotspots.length > 0 && (
          <div className={styles.hotspotsOverlay}>
            {data.hotspots.map((hotspot) => (
              <div
                key={hotspot.id}
                className={`${styles.hotspot} nodrag ${data.selectedHotspotId === hotspot.id ? styles.hotspotSelected : ""} ${hotspot.targetScreenId ? styles.hotspotConnected : ""}`}
                style={{
                  left: `${hotspot.x}%`,
                  top: `${hotspot.y}%`,
                  width: `${hotspot.width}%`,
                  height: `${hotspot.height}%`,
                }}
                title={hotspot.label || hotspot.hint || "Hotspot"}
                onPointerDown={(e) => handleHotspotPointerDown(e, hotspot)}
              />
            ))}
          </div>
        )}

        {isDrawing && (
          <div
            className={styles.drawHotspot}
            style={{
              left: `${Math.min(drawStart.x, drawCurrent.x)}%`,
              top: `${Math.min(drawStart.y, drawCurrent.y)}%`,
              width: `${Math.abs(drawCurrent.x - drawStart.x)}%`,
              height: `${Math.abs(drawCurrent.y - drawStart.y)}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}

export const ScreenNode = memo(ScreenNodeComponent);
