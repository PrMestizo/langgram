"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Handle, Position } from "reactflow";
import { useDnD } from "./DnDContext";
import { useFilterNodeActions } from "./FilterNodeActionsContext";

const FilterNode = ({ id, data, selected }) => {
  const { filterCode = "", filterName = "" } = data || {};
  const { onEditFilter, onOpenContextMenu, onApplyFilter, onSelectFilter } =
    useFilterNodeActions();

  const hasFilter =
    (filterCode || "").trim().length > 0 || (filterName || "").trim().length > 0;
  const [isNear, setIsNear] = useState(false);
  const { dragPayload, resetDrag } = useDnD();

  const isDraggingFilter = dragPayload?.kind === "edge";

  const className = useMemo(() => {
    const isVisible = hasFilter || selected || isNear || isDraggingFilter;
    return [
      "filter-node",
      hasFilter ? "has-filter" : "",
      selected ? "selected" : "",
      isVisible ? "is-visible" : "",
      isDraggingFilter ? "is-droppable" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [hasFilter, isDraggingFilter, isNear, selected]);

  const handlePointerEnter = useCallback(() => {
    setIsNear(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsNear(false);
  }, []);

  const handleFocus = useCallback(() => {
    if (hasFilter) {
      onSelectFilter?.(id);
    }
    setIsNear(true);
  }, [hasFilter, id, onSelectFilter]);

  const handleBlur = useCallback(() => {
    setIsNear(false);
  }, []);

  const handleClick = useCallback(
    (event) => {
      event.stopPropagation();
      if (hasFilter) {
        onSelectFilter?.(id);
        return;
      }
      onEditFilter?.(id);
    },
    [hasFilter, id, onEditFilter, onSelectFilter]
  );

  const handleContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      onSelectFilter?.(id);
      if (hasFilter) {
        onOpenContextMenu?.(id, { x: event.clientX, y: event.clientY });
        return;
      }
      onEditFilter?.(id);
    },
    [hasFilter, id, onEditFilter, onOpenContextMenu, onSelectFilter]
  );

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
      onSelectFilter?.(id);
      onApplyFilter?.(id, {
        code: dragPayload.code ?? "",
        name: dragPayload.name ?? "",
        id: dragPayload.id ?? null,
        templateId: dragPayload.templateId ?? dragPayload.id ?? null,
      });
      resetDrag?.();
      setIsNear(false);
    },
    [dragPayload, id, isDraggingFilter, onApplyFilter, onSelectFilter, resetDrag]
  );

  const handleDragLeave = useCallback(() => {
    if (!isDraggingFilter) {
      return;
    }
    setIsNear(false);
  }, [isDraggingFilter]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      handleClick(event);
    },
    [handleClick]
  );

  return (
    <div className="filter-node-wrapper">
      <Handle type="target" position={Position.Top} />
      <div
        role="button"
        tabIndex={0}
        className={className}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
        title={
          hasFilter
            ? filterName
              ? `Editar filtro: ${filterName}`
              : "Editar filtro"
            : "Añadir filtro"
        }
        aria-label={
          hasFilter
            ? filterName
              ? `Editar filtro ${filterName}`
              : "Editar filtro"
            : "Añadir filtro"
        }
      >
        <span className="filter-node__ring" aria-hidden="true" />
        {hasFilter ? (
          <span className="filter-node-icon" aria-hidden="true">
            <span className="filter-node-icon__glow" />
          </span>
        ) : (
          <span className="filter-node__plus" aria-hidden="true">
            +
          </span>
        )}
      </div>
      {hasFilter && filterName ? (
        <span className="filter-node-label" aria-hidden="true">
          {filterName}
        </span>
      ) : null}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default memo(FilterNode);
