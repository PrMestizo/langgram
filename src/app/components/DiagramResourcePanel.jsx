"use client";

import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { TbPrompt } from "react-icons/tb";
import { GiCrossedChains } from "react-icons/gi";
import { FaTools } from "react-icons/fa";
import dynamic from "next/dynamic";
import { Box } from "@mui/material";
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <Box sx={{ p: 2 }}>Cargando editor...</Box>,
});

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
            <div
              className="diagram-resource-sidebar__item-icon"
              aria-hidden="true"
            >
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

const StategraphSummary = ({ value, onChange }) => {
  return (
    <Box
      sx={{
        flex: 1,
        Height: "60vh",
        border: "1px solid #eeededff",
        borderRadius: 1,
        overflow: "hidden",
        "& .monaco-editor": {
          "--vscode-editor-background": "#1E1E1E",
          "--vscode-editor-foreground": "#D4D4D4",
          "--vscode-editor-lineHighlightBackground": "#2A2D2E",
        },
        "& .monaco-scrollable-element > .scrollbar > .slider": {
          background: "rgba(121, 121, 121, 0.4) !important",
          "&:hover": {
            background: "rgba(100, 100, 100, 0.7) !important",
          },
          "&:active": {
            background: "rgba(191, 191, 191, 0.4) !important",
          },
        },
      }}
    >
      <MonacoEditor
        height="100%"
        defaultLanguage="python"
        theme="vs-dark"
        value={value ?? ""}
        onChange={(nextValue) => {
          if (typeof onChange === "function") {
            onChange(nextValue ?? "");
          }
        }}
        options={{
          automaticLayout: true,
          fontSize: 14,
          lineNumbers: "on",
          wordWrap: "on",
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          tabSize: 2,
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            useShadows: true,
          },
        }}
      />
    </Box>
  );
};

export default function DiagramResourcePanel({
  isOpen,
  isResourceDrag,
  activeTab,
  onSelectTab,
  stategraphCode,
  onStategraphChange,
  resourcePrompts,
  resourceChains,
  resourceTools,
  onDragOver,
  onDrop,
  onRemoveResource,
}) {
  return (
    <>
      <div
        className={`diagram-resource-tabs${
          isOpen ? " diagram-resource-tabs--open" : ""
        }`}
        role="tablist"
        aria-orientation="vertical"
      >
        <button
          type="button"
          className={`diagram-resource-tab-button${
            activeTab === "stategraph"
              ? " diagram-resource-tab-button--active"
              : ""
          }`}
          onClick={() => onSelectTab("stategraph")}
          aria-controls="diagram-resource-sidebar"
          aria-selected={activeTab === "stategraph"}
          role="tab"
        >
          Stategraph
        </button>
        <button
          type="button"
          className={`diagram-resource-tab-button${
            activeTab === "resources"
              ? " diagram-resource-tab-button--active"
              : ""
          }`}
          onClick={() => onSelectTab("resources")}
          aria-controls="diagram-resource-sidebar"
          aria-selected={activeTab === "resources"}
          role="tab"
        >
          Recursos
        </button>
      </div>
      <aside
        id="diagram-resource-sidebar"
        className={`diagram-resource-sidebar${
          isOpen ? " diagram-resource-sidebar--open" : ""
        }${
          isOpen && isResourceDrag
            ? " diagram-resource-sidebar--active-drop"
            : ""
        }`}
        aria-hidden={!isOpen}
        aria-labelledby="diagram-resource-sidebar-title"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {activeTab === "stategraph" ? (
          <>
            <div className="diagram-resource-sidebar__header">
              <h2
                id="diagram-resource-sidebar-title"
                className="diagram-resource-sidebar__title"
              >
                Vista Stategraph
              </h2>
              <Tooltip
                title="Aquí puedes ver y editar el código del Stategraph asociado a tu diagrama."
                arrow
              >
                <IconButton>
                  <InfoOutlinedIcon className="diagram-resource-sidebar__tooltip" />
                </IconButton>
              </Tooltip>
            </div>
            <StategraphSummary
              value={stategraphCode}
              onChange={onStategraphChange}
            />
          </>
        ) : (
          <>
            <div className="diagram-resource-sidebar__header">
              <h2
                id="diagram-resource-sidebar-title"
                className="diagram-resource-sidebar__title"
              >
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
          </>
        )}
      </aside>
    </>
  );
}
