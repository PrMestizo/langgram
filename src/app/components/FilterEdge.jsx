"use client";
import { memo, useCallback, useMemo, useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "reactflow";

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
}) => {
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
  const hasFilter = filterCode.trim().length > 0;
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
    onEditFilter?.(id);
  };

  const edgeStyle = {
    stroke: hasFilter ? "#0d9488" : style.stroke || "#94a3b8",
    strokeWidth: selected ? 3 : style.strokeWidth || 2,
    ...style,
  };

  const className = useMemo(() => {
    return [
      "filter-edge-circle",
      hasFilter ? "has-filter" : "",
      selected ? "selected" : "",
      isNear ? "is-visible" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [hasFilter, isNear, selected]);

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
          <button
            type="button"
            className={className}
            onClick={handleClick}
            onFocus={handleFocus}
            onBlur={handleBlur}
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
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(FilterEdge);
