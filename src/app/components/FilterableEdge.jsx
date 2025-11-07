"use client";

import { memo, useCallback, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from "reactflow";

const FilterableEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
  selected,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const showAddButton =
    data?.showAddButton !== false && typeof data?.onAddFilter === "function";
  const isVisible = isHovered || selected;

  const handleInteractionStart = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleInteractionEnd = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleAddClick = useCallback(
    (event) => {
      event.stopPropagation();
      const edgeType =
        data?.edgeType || data?.connectionType || data?.baseType || "smoothstep";
      data?.onAddFilter?.({
        edgeId: id,
        sourceId: data?.source ?? source,
        targetId: data?.target ?? target,
        edgeType,
        position: {
          x: (sourceX + targetX) / 2,
          y: (sourceY + targetY) / 2,
        },
      });
    },
    [data, id, source, sourceX, sourceY, target, targetX, targetY]
  );

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {showAddButton ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
          >
            <div className={`filter-slot ${isVisible ? "is-visible" : ""}`}>
              <button
                type="button"
                className="filter-slot__trigger"
                onMouseEnter={handleInteractionStart}
                onMouseLeave={handleInteractionEnd}
                onFocus={handleInteractionStart}
                onBlur={handleInteractionEnd}
                onClick={handleAddClick}
                aria-label="Añadir filtro"
              >
                <span className="filter-slot__ring" aria-hidden="true" />
                <span className="filter-slot__plus" aria-hidden="true">
                  +
                </span>
              </button>
            </div>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
};

export default memo(FilterableEdge);

