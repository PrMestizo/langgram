"use client";

import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { TbPrompt } from "react-icons/tb";
import { GiCrossedChains } from "react-icons/gi";
import { FaTools } from "react-icons/fa";
import { BiCodeBlock } from "react-icons/bi";
import { RiSparkling2Line } from "react-icons/ri";
import { FiSidebar } from "react-icons/fi";
import dynamic from "next/dynamic";
import { Box } from "@mui/material";
import { Checkbox, FormControlLabel } from "@mui/material";
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
        height: "60vh",
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
        height="48vh"
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
  memoryComplement,
  onToggleMemory,
}) {
  const memoryEnabled = Boolean(memoryComplement?.enabled);
  const memoryCode =
    typeof memoryComplement?.code === "string" ? memoryComplement.code : "";
  const totalResources =
    resourcePrompts.length + resourceChains.length + resourceTools.length;

  const tabs = [
    { id: "stategraph", label: "Stategraph", icon: BiCodeBlock },
    { id: "resources", label: "Recursos", icon: TbPrompt },
    { id: "complementos", label: "Complementos", icon: RiSparkling2Line },
  ];
  return (
    <div className="diagram-resource-shell">
      <button
        type="button"
        className={`diagram-resource-launcher${
          isOpen ? " diagram-resource-launcher--open" : ""
        }`}
        onClick={() => onSelectTab(activeTab ?? "resources")}
        aria-expanded={isOpen}
        aria-controls="diagram-resource-sidebar"
      >
        <span className="diagram-resource-launcher__icon" aria-hidden="true">
          <FiSidebar />
        </span>
        <span className="diagram-resource-launcher__label">
          Panel de recursos
        </span>
        <span className="diagram-resource-launcher__badge">
          {totalResources}
        </span>
      </button>
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
        <div className="diagram-resource-sidebar__header">
          <div className="diagram-resource-sidebar__heading">
            <p className="diagram-resource-sidebar__eyebrow">Zona lateral</p>
            <h2
              id="diagram-resource-sidebar-title"
              className="diagram-resource-sidebar__title"
            >
              Biblioteca del diagrama
            </h2>
            <p className="diagram-resource-sidebar__subtitle">
              Organiza el Stategraph, los recursos y los complementos en un solo
              lugar.
            </p>
          </div>
          <div className="diagram-resource-sidebar__header-actions">
            <Tooltip title="Cerrar panel" arrow placement="left">
              <IconButton
                size="small"
                onClick={() => onSelectTab(activeTab)}
                aria-label="Cerrar panel de recursos"
              >
                <CloseIcon className="diagram-resource-sidebar__tooltip" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        <div className="diagram-resource-tablist" role="tablist">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`diagram-resource-tab-chip${
                activeTab === id ? " diagram-resource-tab-chip--active" : ""
              }`}
              onClick={() => onSelectTab(id)}
              aria-selected={activeTab === id}
              role="tab"
            >
              <span>{label}</span>
            </button>
          ))}
        </div>

        {activeTab === "stategraph" ? (
          <div className="diagram-resource-content">
            <div className="diagram-resource-sidebar__section">
              <div className="diagram-resource-sidebar__section-head">
                <div>
                  <p className="diagram-resource-sidebar__eyebrow">
                    Estado en vivo
                  </p>
                  <h3 className="diagram-resource-sidebar__section-title">
                    Vista Stategraph
                  </h3>
                </div>
                <Tooltip
                  title="Aquí puedes ver y editar el código del Stategraph asociado a tu diagrama."
                  arrow
                >
                  <IconButton size="small">
                    <InfoOutlinedIcon className="diagram-resource-sidebar__tooltip" />
                  </IconButton>
                </Tooltip>
              </div>
              <StategraphSummary
                value={stategraphCode}
                onChange={onStategraphChange}
              />
            </div>
          </div>
        ) : activeTab === "complementos" ? (
          <div className="diagram-resource-content">
            <div className="diagram-resource-sidebar__section">
              <div className="diagram-resource-sidebar__section-head">
                <div>
                  <p className="diagram-resource-sidebar__eyebrow">
                    Extensiones
                  </p>
                  <h3 className="diagram-resource-sidebar__section-title">
                    Complementos del diagrama
                  </h3>
                </div>
                <Tooltip
                  title="Aquí puedes gestionar los complementos del diagrama."
                  arrow
                >
                  <IconButton size="small">
                    <InfoOutlinedIcon className="diagram-resource-sidebar__tooltip" />
                  </IconButton>
                </Tooltip>
              </div>
              <FormControlLabel
                control={
                  <Checkbox
                    sx={{
                      color: "#f9fafb",
                      "&.Mui-checked": {
                        color: "#60a5fa",
                      },
                    }}
                    checked={memoryEnabled}
                    onChange={(event) => {
                      if (typeof onToggleMemory === "function") {
                        onToggleMemory(event.target.checked);
                      }
                    }}
                  />
                }
                label="Memory"
                sx={{
                  color: "#f9fafb",
                  mt: -1,

                  "& .MuiFormControlLabel-label": {
                    fontWeight: 600,
                  },
                }}
              />
              <div className="diagram-resource-sidebar__memory-preview">
                <p className="diagram-resource-sidebar__memory-description">
                  {memoryEnabled
                    ? "El chatbot utilizará memoria para recordar el historial de la conversación."
                    : "El chatbot no utilizará memoria en esta configuración."}
                </p>
                <Box
                  sx={{
                    height: "220px",
                    border: "1px solid #2f3542",
                    borderRadius: 2,
                    overflow: "hidden",
                    "& .monaco-editor": {
                      "--vscode-editor-background": "#1b1b1b",
                      "--vscode-editor-foreground": "#dbeafe",
                      "--vscode-editor-lineHighlightBackground": "#1f2937",
                    },
                    "& .monaco-scrollable-element > .scrollbar > .slider": {
                      background: "rgba(191, 219, 254, 0.35) !important",
                      "&:hover": {
                        background: "rgba(191, 219, 254, 0.6) !important",
                      },
                      "&:active": {
                        background: "rgba(125, 211, 252, 0.8) !important",
                      },
                    },
                  }}
                >
                  <MonacoEditor
                    height="100%"
                    defaultLanguage="python"
                    theme="vs-dark"
                    value={memoryCode}
                    options={{
                      readOnly: true,
                      automaticLayout: true,
                      fontSize: 12,
                      lineNumbers: "off",
                      wordWrap: "on",
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                      tabSize: 2,
                      scrollbar: {
                        vertical: "auto",
                        horizontal: "hidden",
                        useShadows: true,
                      },
                    }}
                  />
                </Box>
              </div>
            </div>
          </div>
        ) : (
          <div className="diagram-resource-content">
            <div className="diagram-resource-sidebar__section">
              <div className="diagram-resource-sidebar__section-head">
                <div>
                  <p className="diagram-resource-sidebar__eyebrow">
                    Biblioteca
                  </p>
                  <h3 className="diagram-resource-sidebar__section-title">
                    Recursos del diagrama
                  </h3>
                </div>
                <Tooltip
                  title="Arrastra prompts, chains y tools desde la barra izquierda para incluirlos en el diagrama sin asociarlos a un nodo."
                  arrow
                >
                  <IconButton size="small">
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
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
