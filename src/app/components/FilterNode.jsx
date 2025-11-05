"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useDnD } from "./DnDContext";

const FilterNode = ({ data = {}, selected }) => {
  const {
    edgeId,
    filterName = "",
    filterCode = "",
    variant = "default",
    onEditFilter,
    onOpenContextMenu,
    onApplyFilter,
    onSelectEdge,
  } = data;

  const hasFilter = filterName.trim().length > 0 || filterCode.trim().length > 0;
  const { dragPayload, resetDrag } = useDnD();
  const isDraggingFilter = dragPayload?.kind === "edge";
  const [isOver, setIsOver] = useState(false);

  const handleClick = useCallback(
    (event) => {
      event.stopPropagation();
      if (hasFilter) {
        onSelectEdge?.(edgeId);
        return;
      }
      onEditFilter?.(edgeId);
    },
    [edgeId, hasFilter, onEditFilter, onSelectEdge]
  );

  const handleContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      onSelectEdge?.(edgeId);
      if (hasFilter) {
        onOpenContextMenu?.(edgeId, { x: event.clientX, y: event.clientY });
        return;
      }
      onEditFilter?.(edgeId);
    },
    [edgeId, hasFilter, onEditFilter, onOpenContextMenu, onSelectEdge]
  );

  const handleFocus = useCallback(() => {
    if (hasFilter) {
      onSelectEdge?.(edgeId);
    }
  }, [edgeId, hasFilter, onSelectEdge]);

  const handleDragOver = useCallback(
    (event) => {
      if (!isDraggingFilter) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setIsOver(true);
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
      onSelectEdge?.(edgeId);
      onApplyFilter?.(edgeId, {
        code: dragPayload.code ?? "",
        name: dragPayload.name ?? "",
        id: dragPayload.id ?? null,
      });
      resetDrag?.();
      setIsOver(false);
    },
    [dragPayload, edgeId, isDraggingFilter, onApplyFilter, onSelectEdge, resetDrag]
  );

  const handleDragLeave = useCallback(() => {
    if (!isDraggingFilter) {
      return;
    }
    setIsOver(false);
  }, [isDraggingFilter]);

  const buttonClassName = useMemo(() => {
    return [
      "filter-node__button",
      hasFilter ? "has-filter" : "",
      selected ? "selected" : "",
      isDraggingFilter && isOver ? "is-droppable" : "",
      variant === "conditional" ? "filter-node__button--conditional" : "",
      variant === "conditional" && hasFilter
        ? "filter-node__button--conditional-filled"
        : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, [hasFilter, isDraggingFilter, isOver, selected, variant]);

  const title = hasFilter
    ? filterName
      ? `Editar filtro condicional: ${filterName}`
      : "Editar filtro condicional"
    : "Añadir filtro condicional";

  const ariaLabel = hasFilter
    ? filterName
      ? `Editar filtro condicional ${filterName}`
      : "Editar filtro condicional"
    : "Añadir filtro condicional";

  if (!edgeId) {
    return null;
  }

  return (
    <div className="filter-node">
      <button
        type="button"
        className={buttonClassName}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onFocus={handleFocus}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
        title={title}
        aria-label={ariaLabel}
      >
        {hasFilter ? "ƒ" : "+"}
      </button>
      {hasFilter && filterName ? (
        <span className="filter-node__label" aria-hidden="true">
          {filterName}
        </span>
      ) : null}
    </div>
  );
};

export default memo(FilterNode);
