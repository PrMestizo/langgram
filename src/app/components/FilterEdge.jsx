"use client";
import { memo, useCallback, useMemo, useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "reactflow";
import { useDnD } from "./DnDContext";

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
}) => {
  const { dragPayload, resetDrag } = useDnD();
  const [edgePath, labelX, labelY] = getBezierPath({
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
  const [isNear, setIsNear] = useState(false);

  const handlePointerEnter = useCallback(() => {
    setIsNear(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsNear(false);
  }, []);

  const handleFocus = useCallback(() => {
    setIsNear(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsNear(false);
  }, []);

  const handleClick = (event) => {
    event.stopPropagation();
    if (hasFilter) {
      return;
    }
    onEditFilter?.(id);
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    event.stopPropagation();
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

  const isDraggingFilter = dragPayload?.kind === "edge";

  const className = useMemo(() => {
    const isVisible = hasFilter || selected || isNear || isDraggingFilter;
    return [
      "filter-edge-circle",
      hasFilter ? "has-filter" : "",
      selected ? "selected" : "",
      isVisible ? "is-visible" : "",
      isDraggingFilter ? "is-dragging" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [hasFilter, isDraggingFilter, isNear, selected]);

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
      onApplyFilter?.(id, {
        code: dragPayload.code ?? "",
        name: dragPayload.name ?? "",
      });
      resetDrag?.();
      setIsNear(false);
    },
    [dragPayload, id, isDraggingFilter, onApplyFilter, resetDrag]
  );

  const handleDragLeave = useCallback(() => {
    if (!isDraggingFilter) {
      return;
    }
    setIsNear(false);
  }, [isDraggingFilter]);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={edgeStyle}
      />
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
