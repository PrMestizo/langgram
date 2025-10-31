"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "reactflow";
import { useDnD } from "./DnDContext";

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
  onEditFilter,
  onOpenContextMenu,
  onApplyFilter,
  onSelectEdge,
  variant = "default",
}) => {
  const { dragPayload, resetDrag } = useDnD();
  const [defaultEdgePath, defaultLabelX, defaultLabelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  let edgePath = defaultEdgePath;
  let labelX = defaultLabelX;
  let labelY = defaultLabelY;

  const filterCode = data?.filterCode ?? "";
  const filterName = data?.filterName ?? "";
  const hasFilter =
    filterCode.trim().length > 0 || filterName.trim().length > 0;
  const [isNear, setIsNear] = useState(false);

  const conditionalGroupId = data?.conditionalGroupId ?? null;
  const conditionalCount = data?.conditionalCount ?? 0;
  const conditionalIndex = data?.conditionalIndex ?? 0;
  const conditionalPrimary = data?.conditionalPrimary ?? false;
  const conditionalOffset = data?.conditionalOffset;
  const conditionalBranchDistance = data?.conditionalBranchDistance ?? 48;

  const isConditionalVariant =
    variant === "conditional" || (conditionalGroupId && conditionalCount >= 2);

  let branchPoint = null;

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
    labelX = branchX + (targetX - branchX) * 0.55;
    labelY = branchY + (targetY - branchY) * 0.55;
  }

  const handlePointerEnter = useCallback(() => {
    setIsNear(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsNear(false);
  }, []);

  const handleFocus = useCallback(() => {
    onSelectEdge?.(id);
    setIsNear(true);
  }, [id, onSelectEdge]);

  const handleBlur = useCallback(() => {
    setIsNear(false);
  }, []);

  const handleClick = (event) => {
    onSelectEdge?.(id);
    event.stopPropagation();
    if (hasFilter) {
      return;
    }
    onEditFilter?.(id);
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSelectEdge?.(id);
    if (hasFilter) {
      onOpenContextMenu?.(id, { x: event.clientX, y: event.clientY });
      return;
    }
    onEditFilter?.(id);
  };

  const edgeStyle = {
    ...style,
    stroke: hasFilter ? "#0d9488" : style.stroke || "#94a3b8",
    strokeWidth: selected ? 3 : style.strokeWidth || 2,
  };

  if (isConditionalVariant) {
    edgeStyle.strokeDasharray = style.strokeDasharray || "8 6";
    edgeStyle.strokeLinecap = style.strokeLinecap || "round";
    edgeStyle.strokeLinejoin = style.strokeLinejoin || "round";
  }

  const isDraggingFilter = dragPayload?.kind === "edge";

  const className = useMemo(() => {
    const isVisible =
      hasFilter ||
      selected ||
      isNear ||
      isDraggingFilter ||
      isConditionalVariant;
    return [
      "filter-edge-circle",
      hasFilter ? "has-filter" : "",
      selected ? "selected" : "",
      isVisible ? "is-visible" : "",
      isDraggingFilter ? "is-dragging" : "",
      isConditionalVariant ? "filter-edge-circle--conditional" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [hasFilter, isConditionalVariant, isDraggingFilter, isNear, selected]);

  const handleDragOver = useCallback(
    (event) => {
      if (!isDraggingFilter) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setIsNear(true);
    },
    [isDraggingFilter]
  );

  const handleDrop = useCallback(
    (event) => {
      if (!isDraggingFilter || !dragPayload) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onSelectEdge?.(id);
      onApplyFilter?.(id, {
        code: dragPayload.code ?? "",
        name: dragPayload.name ?? "",
      });
      resetDrag?.();
      setIsNear(false);
    },
    [dragPayload, id, isDraggingFilter, onApplyFilter, onSelectEdge, resetDrag]
  );

  const handleDragLeave = useCallback(() => {
    if (!isDraggingFilter) {
      return;
    }
    setIsNear(false);
  }, [isDraggingFilter]);

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
              transform: `translate(-50%, -50%) translate(${branchPoint.x}px, ${branchPoint.y}px)`,
              pointerEvents: "none",
            }}
            aria-hidden="true"
          >
            <div className="conditional-branch-node__circle" />
          </div>
        </EdgeLabelRenderer>
      ) : null}
      <EdgeLabelRenderer>
        <div
          className="filter-edge-hover-area"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
            width: 96,
            height: 96,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={handlePointerEnter}
          onMouseLeave={handlePointerLeave}
        >
          <div className="filter-edge-content">
            {(!isConditionalVariant || hasFilter) && (
              <button
                type="button"
                className={className}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragLeave={handleDragLeave}
                title={
                  hasFilter
                    ? filterName
                      ? `Editar filtro condicional: ${filterName}`
                      : "Editar filtro condicional"
                    : "Añadir filtro condicional"
                }
                aria-label={
                  hasFilter
                    ? filterName
                      ? `Editar filtro condicional ${filterName}`
                      : "Editar filtro condicional"
                    : "Añadir filtro condicional"
                }
              >
                {hasFilter ? "ƒ" : "+"}
              </button>
            )}
            {hasFilter && filterName ? (
              <span className="filter-edge-label" aria-hidden="true">
                {filterName}
              </span>
            ) : null}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(FilterEdge);
