"use client";
import { memo, useMemo } from "react";
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
  const hasFilter = filterCode.trim().length > 0;

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
    ]
      .filter(Boolean)
      .join(" ");
  }, [hasFilter, selected]);

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
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          <button
            type="button"
            className={className}
            onClick={handleClick}
            title={
              hasFilter
                ? "Editar filtro condicional"
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
