import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";
import styles from "./TransitionEdge.module.css";

export interface TransitionEdgeData extends Record<string, unknown> {
  label: string;
  hotspotId?: string;
}

export type TransitionEdgeType = Edge<TransitionEdgeData>;

type TransitionEdgeProps = EdgeProps<TransitionEdgeType>;

function TransitionEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style,
  markerEnd,
}: TransitionEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeStyle = {
    ...style,
    stroke: selected ? "#3b82f6" : "#94a3b8",
    strokeWidth: selected ? 3 : 2,
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          className={`${styles.labelContainer} ${selected ? styles.selected : ""}`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <span className={styles.label}>{data?.label || "Transition"}</span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const TransitionEdge = memo(TransitionEdgeComponent);
