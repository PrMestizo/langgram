"use client";

import { memo, useMemo } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "reactflow";

const DEFAULT_CONDITIONAL_SPREAD = 70;
const MIN_BRANCH_DISTANCE = 32;

const FilterEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
  variant = "default",
}) => {
  const [defaultEdgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const filterCode = data?.filterCode ?? "";
  const filterName = data?.filterName ?? "";
  const hasFilter =
    filterCode.trim().length > 0 || filterName.trim().length > 0;

  const conditionalGroupId = data?.conditionalGroupId ?? null;
  const conditionalCount = data?.conditionalCount ?? 0;
  const conditionalIndex = data?.conditionalIndex ?? 0;
  const conditionalPrimary = data?.conditionalPrimary ?? false;
  const conditionalOffset = data?.conditionalOffset;
  const conditionalBranchDistance = data?.conditionalBranchDistance ?? 48;

  const isConditionalVariant =
    variant === "conditional" || (conditionalGroupId && conditionalCount >= 2);

  let branchPoint = null;
  let edgePath = defaultEdgePath;

  if (isConditionalVariant) {
    const verticalDirection = targetY >= sourceY ? 1 : -1;
    const travelDistance = Math.abs(targetY - sourceY);
    const dynamicBranchDistance = Math.min(
      Math.max(conditionalBranchDistance, MIN_BRANCH_DISTANCE),
      Math.max(Math.min(travelDistance * 0.4, 140), MIN_BRANCH_DISTANCE)
    );
    const branchX = sourceX;
    const branchY = sourceY + verticalDirection * dynamicBranchDistance;
    branchPoint = { x: branchX, y: branchY };

    const spreadValue =
      conditionalOffset !== undefined && conditionalOffset !== null
        ? conditionalOffset
        : (conditionalIndex - (conditionalCount - 1) / 2) *
          DEFAULT_CONDITIONAL_SPREAD;

    const controlX = branchX + spreadValue;
    const controlY = branchY + (targetY - branchY) * 0.7;

    edgePath = `M ${sourceX},${sourceY} L ${branchX},${branchY} Q ${controlX},${controlY} ${targetX},${targetY}`;
  }

  const edgeStyle = useMemo(() => {
    const nextStyle = {
      ...style,
      stroke: hasFilter ? "#0d9488" : style.stroke || "#94a3b8",
      strokeWidth: selected ? 3 : style.strokeWidth || 2,
    };

    if (isConditionalVariant) {
      nextStyle.strokeDasharray = style.strokeDasharray || "8 6";
      nextStyle.strokeLinecap = style.strokeLinecap || "round";
      nextStyle.strokeLinejoin = style.strokeLinejoin || "round";
    }

    return nextStyle;
  }, [hasFilter, isConditionalVariant, selected, style]);

  const branchClassName = useMemo(() => {
    if (!isConditionalVariant) {
      return "conditional-branch-node";
    }
    return [
      "conditional-branch-node",
      conditionalPrimary ? "conditional-branch-node--primary" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [conditionalPrimary, isConditionalVariant]);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={edgeStyle}
      />
      {isConditionalVariant && branchPoint && conditionalPrimary ? (
        <EdgeLabelRenderer>
          <div
            className={branchClassName}
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${branchPoint.x}px, ${branchPoint.y}px)` ,
              pointerEvents: "none",
            }}
            aria-hidden="true"
          >
            <div className="conditional-branch-node__circle" />
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
};

export default memo(FilterEdge);
