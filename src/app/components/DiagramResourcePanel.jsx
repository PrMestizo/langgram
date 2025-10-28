"use client";

import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { TbPrompt } from "react-icons/tb";
import { GiCrossedChains } from "react-icons/gi";
import { FaTools } from "react-icons/fa";

const ResourceSection = ({
  icon: Icon,
  label,
  kind,
  items,
  emptyMessage,
  onRemove,
}) => (
  <div className="diagram-resource-sidebar__section">
    <h3 className="diagram-resource-sidebar__section-title">
      <Icon aria-hidden="true" />
      <span>{label}</span>
      <span className="diagram-resource-sidebar__count">{items.length}</span>
    </h3>
    {items.length === 0 ? (
      <p className="diagram-resource-sidebar__empty">{emptyMessage}</p>
    ) : (
      <ul className="diagram-resource-sidebar__list">
        {items.map((item) => (
          <li
            key={`${kind}-${item.name}`}
            className={`diagram-resource-sidebar__item diagram-resource-sidebar__item--${kind}`}
          >
            <div className="diagram-resource-sidebar__item-icon" aria-hidden="true">
              <Icon />
            </div>
            <div className="diagram-resource-sidebar__item-body">
              <span className="diagram-resource-sidebar__item-title">
                {item.name}
              </span>
            </div>
            <button
              type="button"
              className="diagram-resource-sidebar__remove"
              onClick={() => onRemove(kind, item.name)}
              aria-label={`Quitar ${kind} ${item.name}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default function DiagramResourcePanel({
  isOpen,
  isResourceDrag,
  resourcePrompts,
  resourceChains,
  resourceTools,
  onToggle,
  onDragOver,
  onDrop,
  onRemoveResource,
}) {
  return (
    <>
      <button
        type="button"
        className={`diagram-resource-tab${isOpen ? " diagram-resource-tab--open" : ""}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="diagram-resource-sidebar"
      >
        Recursos
      </button>
      <aside
        id="diagram-resource-sidebar"
        className={`diagram-resource-sidebar${
          isOpen ? " diagram-resource-sidebar--open" : ""
        }${isOpen && isResourceDrag ? " diagram-resource-sidebar--active-drop" : ""}`}
        aria-hidden={!isOpen}
        aria-labelledby="diagram-resource-sidebar-title"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div className="diagram-resource-sidebar__header">
          <h2 id="diagram-resource-sidebar-title" className="diagram-resource-sidebar__title">
            Recursos del diagrama
          </h2>
          <Tooltip
            title="Arrastra prompts, chains y tools desde la barra izquierda para incluirlos en el diagrama sin asociarlos a un nodo."
            arrow
          >
            <IconButton>
              <InfoOutlinedIcon className="diagram-resource-sidebar__tooltip" />
            </IconButton>
          </Tooltip>
        </div>

        <ResourceSection
          icon={TbPrompt}
          label="Prompts"
          kind="prompt"
          items={resourcePrompts}
          emptyMessage="Aún no hay prompts en el diagrama."
          onRemove={onRemoveResource}
        />

        <ResourceSection
          icon={GiCrossedChains}
          label="Chains"
          kind="chain"
          items={resourceChains}
          emptyMessage="Aún no hay chains en el diagrama."
          onRemove={onRemoveResource}
        />

        <ResourceSection
          icon={FaTools}
          label="Tools"
          kind="tool"
          items={resourceTools}
          emptyMessage="Aún no hay tools en el diagrama."
          onRemove={onRemoveResource}
        />
      </aside>
    </>
  );
}
