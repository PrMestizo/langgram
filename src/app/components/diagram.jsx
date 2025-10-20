"use client";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useTheme } from "@mui/material/styles";
import {
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
} from "reactflow";

// Importación dinámica del Monaco Editor para SSR
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <Box sx={{ p: 2 }}>Cargando editor...</Box>,
});

import "reactflow/dist/style.css";
import Sidebar from "./Sidebar";
import { DnDProvider, useDnD } from "./DnDContext";
import { generateCodeFromGraph } from "../lib/codeGenerator";
import FilterEdge from "./FilterEdge";
import CustomModal from "./Modal";
import NodeWithAttachments from "./NodeWithAttachments";
import {
  Alert,
  Stack,
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { FiMenu } from "react-icons/fi";
import {
  loadPersistedDiagram,
  savePersistedDiagram,
} from "../lib/diagramStorage";
import ProfileMenu from "./ProfileMenu";

let id = 0;
const getId = () => `dndnode_${id++}`;

const initialNodes = [
  {
    id: "n1",
    type: "langgramNode",
    position: { x: 0, y: 0 },
    data: { label: "START", nodeType: "START", prompts: [], chains: [] },
  },
  {
    id: "n2",
    type: "langgramNode",
    position: { x: 0, y: 100 },
    data: { label: "END", nodeType: "END", prompts: [], chains: [] },
  },
];

const initialEdges = [
  {
    id: "n1-n2",
    source: "n1",
    target: "n2",
    type: "filterEdge",
    data: { filterCode: "", filterName: "" },
  },
];

const cloneInitialNodes = () =>
  initialNodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      prompts: Array.isArray(node.data?.prompts) ? [...node.data.prompts] : [],
      chains: Array.isArray(node.data?.chains) ? [...node.data.chains] : [],
    },
  }));

const cloneInitialEdges = () =>
  initialEdges.map((edge) => ({
    ...edge,
    data: edge.data ? { ...edge.data } : undefined,
  }));

const hydrateEdge = (edge) => ({
  id: edge.id || `${edge.source}-${edge.target}`,
  source: edge.source,
  target: edge.target,
  type: edge.type || "filterEdge",
  data: {
    ...(edge.data || {}),
    filterCode: edge.filterCode ?? edge.data?.filterCode ?? "",
    filterName: edge.filterName ?? edge.data?.filterName ?? "",
  },
});

const topNavActionsId = "top-nav-actions";

function Diagram() {
  const { data: session } = useSession();
  const user = session?.user ?? null;
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const closeTopNavMenu = useCallback(() => setIsMenuOpen(false), []);
  const toggleTopNavMenu = useCallback(
    () => setIsMenuOpen((prev) => !prev),
    []
  );
  const { setType, setCode, dragPayload, setDragPayload, resetDrag } = useDnD();
  const { screenToFlowPosition } = useReactFlow();
  const nodeTypes = useMemo(
    () => ({
      langgramNode: NodeWithAttachments,
    }),
    []
  );
  const [alert, setAlert] = useState({
    message: "",
    severity: "success",
    open: false,
  });
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [diagramName, setDiagramName] = useState("");
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [filterEditor, setFilterEditor] = useState({
    open: false,
    edgeId: null,
    name: "",
    code: "",
  });

  const [contextMenu, setContextMenu] = useState({
    open: false,
    edgeId: null,
    x: 0,
    y: 0,
  });

  const openFilterContextMenu = useCallback((edgeId, position) => {
    setContextMenu({ open: true, edgeId, x: position.x, y: position.y });
  }, []);

  const closeFilterContextMenu = useCallback(() => {
    setContextMenu({ open: false, edgeId: null, x: 0, y: 0 });
  }, []);

  const handleFilterClick = useCallback(
    (edgeId) => {
      const targetEdge = edges.find((edge) => edge.id === edgeId);
      setFilterEditor({
        open: true,
        edgeId,
        name: targetEdge?.data?.filterName ?? "",
        code: targetEdge?.data?.filterCode ?? "",
      });
    },
    [edges]
  );

  const closeFilterEditor = useCallback(() => {
    setFilterEditor({ open: false, edgeId: null, name: "", code: "" });
  }, []);

  const handleFilterSave = useCallback(
    async (updatedCode, updatedName) => {
      if (!filterEditor.edgeId) {
        return;
      }

      const trimmedName = (updatedName || "").trim();
      const finalName = trimmedName || "Filtro sin nombre";

      const payload = {
        name: finalName,
        code: updatedCode,
      };

      try {
        const res = await fetch("/api/edges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Error al guardar el filtro");
        }
        const saved = await res.json();
        setEdges((prevEdges) =>
          prevEdges.map((edge) =>
            edge.id === filterEditor.edgeId
              ? {
                  ...edge,
                  data: {
                    ...edge.data,
                    filterCode: updatedCode,
                    filterName: finalName,
                  },
                }
              : edge
          )
        );

        window.dispatchEvent(
          new CustomEvent("edges-updated", { detail: saved })
        );
        setAlert({
          message: `Filtro "${finalName}" guardado correctamente.`,
          severity: "success",
          open: true,
        });
      } catch (err) {
        console.error("Error al guardar edge:", err);
        setAlert({
          message: `Error al guardar el filtro: ${err.message}`,
          severity: "error",
          open: true,
        });
      }
    },
    [filterEditor.edgeId, setEdges, setAlert]
  );

  useEffect(() => {
    if (!filterEditor.open) {
      return;
    }

    const edgeStillExists = edges.some(
      (edge) => edge.id === filterEditor.edgeId
    );
    if (!edgeStillExists) {
      closeFilterEditor();
    }
  }, [closeFilterEditor, edges, filterEditor.edgeId, filterEditor.open]);

  useEffect(() => {
    if (!contextMenu.open) {
      return;
    }

    useEffect(() => {
      if (alert.open) {
        const timer = setTimeout(() => {
          setAlert({ ...alert, open: false });
        }, 3000);
        return () => clearTimeout(timer);
      }
    }, [alert.open]);

    const handleGlobalClick = () => closeFilterContextMenu();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeFilterContextMenu();
      }
    };

    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu.open, closeFilterContextMenu]);

  const handleApplyFilterFromDrag = useCallback(
    (edgeId, filter) => {
      if (!edgeId || !filter) {
        return;
      }

      setEdges((prevEdges) =>
        prevEdges.map((edge) =>
          edge.id === edgeId
            ? {
                ...edge,
                data: {
                  ...edge.data,
                  filterCode: filter.code ?? edge.data?.filterCode ?? "",
                  filterName: filter.name ?? edge.data?.filterName ?? "",
                },
              }
            : edge
        )
      );
      setFilterEditor((prev) =>
        prev.edgeId === edgeId
          ? {
              ...prev,
              name: filter.name ?? "",
              code: filter.code ?? "",
            }
          : prev
      );
    },
    [setEdges, setFilterEditor]
  );

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) {
        closeTopNavMenu();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [closeTopNavMenu]);

  const topNavActionsClassName = useMemo(
    () =>
      isMenuOpen
        ? "top-nav__actions top-nav__actions--open"
        : "top-nav__actions",
    [isMenuOpen]
  );

  const edgeTypes = useMemo(
    () => ({
      filterEdge: (edgeProps) => (
        <FilterEdge
          {...edgeProps}
          onEditFilter={handleFilterClick}
          onOpenContextMenu={openFilterContextMenu}
          onApplyFilter={handleApplyFilterFromDrag}
        />
      ),
    }),
    [handleApplyFilterFromDrag, handleFilterClick, openFilterContextMenu]
  );

  const onNodesChange = useCallback(
    (changes) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    []
  );
  const onConnect = useCallback(
    (params) =>
      setEdges((edgesSnapshot) =>
        addEdge(
          {
            ...params,
            type: "filterEdge",
            data: { filterCode: "", filterName: "" },
          },
          edgesSnapshot
        )
      ),
    []
  );

  const onDragOver = useCallback(
    (event) => {
      event.preventDefault();
      const shouldCopy =
        dragPayload?.kind && dragPayload.kind !== "node" ? true : false;
      event.dataTransfer.dropEffect = shouldCopy ? "copy" : "move";
    },
    [dragPayload?.kind]
  );

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      if (dragPayload?.kind !== "node") {
        resetDrag();
        return;
      }

      if (!dragPayload?.type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const label = dragPayload?.name ?? dragPayload?.type;
      const newNode = {
        id: getId(),
        type: "langgramNode",
        position,
        data: {
          label,
          nodeType: dragPayload?.type,
          prompts: [],
          chains: [],
        },
        code: dragPayload?.code ?? "",
      };

      setNodes((nds) => nds.concat(newNode));
      resetDrag();
    },
    [dragPayload, resetDrag, screenToFlowPosition, setNodes]
  );

  const onDragStart = (event, nodeType, nodeCode) => {
    setType(nodeType);
    setCode(nodeCode);
    setDragPayload({
      kind: "node",
      type: nodeType,
      code: nodeCode || "",
      name: nodeType,
    });
    event.dataTransfer.setData("application/node-type", nodeType);
    event.dataTransfer.setData("application/node-code", nodeCode ?? "");
    event.dataTransfer.effectAllowed = "move";
  };

  const GraphJSON = useCallback(() => {
    const nodeData = nodes.map((n) => ({
      id: n.id,
      type: n.data?.nodeType ?? n.type,
      componentType: n.type,
      label: n.data?.label ?? n.data?.nodeType ?? "",
      position: n.position,
      code: n.code ?? "",
      prompts: Array.isArray(n.data?.prompts) ? n.data.prompts : [],
      chains: Array.isArray(n.data?.chains) ? n.data.chains : [],
    }));

    const edgeData = edges.map((e) => ({
      source: e.source,
      target: e.target,
      id: e.id,
      type: e.type,
      filterCode: e.data?.filterCode || "",
      filterName: e.data?.filterName || "",
    }));

    const graphJSON = { nodes: nodeData, edges: edgeData };
    return graphJSON;
  }, [nodes, edges]);

  const generateCodeWithAI = useCallback(async () => {
    const graphJSON = GraphJSON();
    try {
      const code = await generateCodeFromGraph(graphJSON);
      setGeneratedCode(code ?? "");
    } catch {
      setAlert({
        message: "Error al generar el código con IA",
        severity: "error",
        open: true,
      });
      setIsCodeDialogOpen(false);
    } finally {
      setIsGeneratingCode(false);
    }
  }, [GraphJSON]);

  const handleCloseCodeDialog = useCallback(() => {
    setIsCodeDialogOpen(false);
  }, []);

  const handleDownloadCode = useCallback(() => {
    const blob = new Blob([generatedCode], {
      type: "text/x-python;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "implemented.py";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Mostrar confirmación
    setAlert({
      message: "Archivo Python descargado correctamente",
      severity: "success",
      open: true,
    });
  }, [generatedCode]);

  const handleGeneratedCodeChange = useCallback((value) => {
    setGeneratedCode(value || "");
  }, []);

  const openSaveDialog = () => {
    setDiagramName("");
    setIsSaveDialogOpen(true);
  };

  const handleGenerateButtonClick = useCallback(() => {
    closeTopNavMenu();
    generateCodeWithAI();
    setIsCodeDialogOpen(true);
    setIsGeneratingCode(true);
  }, [closeTopNavMenu, generateCodeWithAI]);

  const handleSaveButtonClick = useCallback(() => {
    closeTopNavMenu();
    openSaveDialog();
  }, [closeTopNavMenu, openSaveDialog]);

  const saveDiagram = async () => {
    const graph = GraphJSON();
    try {
      const name = diagramName || `Diagrama ${new Date().toLocaleString()}`;

      const res = await fetch("/api/diagrams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          content: graph, // Cambiado de 'graph' a 'content' para que coincida con el modelo
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al guardar el diagrama");
      }

      // Disparar evento para actualizar la lista de diagramas
      window.dispatchEvent(new Event("diagrams-updated"));

      // Cerrar el diálogo y limpiar el nombre
      setIsSaveDialogOpen(false);
      setDiagramName("");

      // Mostrar mensaje de éxito
      setAlert({
        message: `¡Diagrama "${name}" guardado exitosamente!`,
        severity: "success",
        open: true,
      });
    } catch (err) {
      console.error("Error al guardar el diagrama:", err);
      setAlert({
        message: `Error al guardar el diagrama: ${err.message}`,
        severity: "error",
        open: true,
      });
    }
  };

  useEffect(() => {
    let cancelled = false;

    const hydrateFromStorage = async () => {
      const storedGraph = await loadPersistedDiagram();
      if (cancelled) {
        return;
      }

      if (storedGraph) {
        try {
          const nextNodes = (storedGraph.nodes || []).map((n) => {
            const nodeType = n.nodeType ?? n.type ?? n.componentType;
            const label = n.label ?? nodeType ?? "";
            const prompts = Array.isArray(n.prompts) ? n.prompts : [];
            const chains = Array.isArray(n.chains) ? n.chains : [];
            return {
              id: n.id,
              type: "langgramNode",
              position: n.position || { x: 0, y: 0 },
              data: {
                label,
                nodeType,
                prompts,
                chains,
              },
              code: n.code ?? "",
            };
          });
          const nextEdges = (storedGraph.edges || []).map(hydrateEdge);
          setNodes(nextNodes);
          setEdges(nextEdges);
        } catch (error) {
          console.error(
            "Error al hidratar el diagrama desde el almacenamiento local:",
            error
          );
        }
      }

      if (!cancelled) {
        setIsHydrated(true);
      }
    };

    hydrateFromStorage();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const persistDiagram = async () => {
      const graph = GraphJSON();
      await savePersistedDiagram(graph);
    };

    persistDiagram();
  }, [GraphJSON, isHydrated]);

  useEffect(() => {
    const handleResetDiagram = () => {
      setNodes(cloneInitialNodes());
      setEdges(cloneInitialEdges());
      setAlert({ message: "", severity: "success", open: false });
      setIsMenuOpen(false);
      setIsSaveDialogOpen(false);
      setDiagramName("");
      closeFilterEditor();
      closeFilterContextMenu();
      resetDrag();
    };

    window.addEventListener("reset-diagram", handleResetDiagram);
    return () => {
      window.removeEventListener("reset-diagram", handleResetDiagram);
    };
  }, [closeFilterContextMenu, closeFilterEditor, resetDrag]);

  const handleClearFilterFromEdge = useCallback(
    (edgeId) => {
      setEdges((prevEdges) =>
        prevEdges.map((edge) =>
          edge.id === edgeId
            ? {
                ...edge,
                data: {
                  ...edge.data,
                  filterCode: "",
                  filterName: "",
                },
              }
            : edge
        )
      );

      if (filterEditor.edgeId === edgeId) {
        closeFilterEditor();
      }
    },
    [closeFilterEditor, filterEditor.edgeId]
  );

  const handleContextMenuEdit = useCallback(() => {
    if (!contextMenu.edgeId) {
      return;
    }

    const targetEdgeId = contextMenu.edgeId;
    closeFilterContextMenu();
    handleFilterClick(targetEdgeId);
  }, [closeFilterContextMenu, contextMenu.edgeId, handleFilterClick]);

  const handleContextMenuDelete = useCallback(() => {
    if (!contextMenu.edgeId) {
      return;
    }

    const targetEdgeId = contextMenu.edgeId;
    handleClearFilterFromEdge(targetEdgeId);
    closeFilterContextMenu();
  }, [closeFilterContextMenu, contextMenu.edgeId, handleClearFilterFromEdge]);

  // Listen for external load requests from the Sidebar
  // Expected payload: { nodes: [{id,type,label,position,code}], edges: [{id,source,target}] }
  // Rebuilds React Flow state accordingly
  useEffect(() => {
    const handler = (ev) => {
      const graph = ev?.detail;
      if (!graph) return;
      try {
        const nextNodes = (graph.nodes || []).map((n) => {
          const nodeType = n.nodeType ?? n.type ?? n.componentType;
          const label = n.label ?? nodeType ?? "";
          const prompts = Array.isArray(n.prompts) ? n.prompts : [];
          const chains = Array.isArray(n.chains) ? n.chains : [];
          return {
            id: n.id,
            type: "langgramNode",
            position: n.position || { x: 0, y: 0 },
            data: {
              label,
              nodeType,
              prompts,
              chains,
            },
            code: n.code ?? "",
          };
        });
        const nextEdges = (graph.edges || []).map(hydrateEdge);
        setNodes(nextNodes);
        setEdges(nextEdges);
      } catch {}
    };
    window.addEventListener("load-diagram", handler);
    return () => window.removeEventListener("load-diagram", handler);
  }, [setNodes, setEdges]);

  return (
    <div className="dndflow">
      <Sidebar
        onLoadDiagram={(graph) => {
          try {
            const nextNodes = (graph.nodes || []).map((n) => {
              const nodeType = n.nodeType ?? n.type ?? n.componentType;
              const label = n.label ?? nodeType ?? "";
              const prompts = Array.isArray(n.prompts) ? n.prompts : [];
              const chains = Array.isArray(n.chains) ? n.chains : [];
              return {
                id: n.id,
                type: "langgramNode",
                position: n.position || { x: 0, y: 0 },
                data: {
                  label,
                  nodeType,
                  prompts,
                  chains,
                },
                code: n.code ?? "",
              };
            });
            const nextEdges = (graph.edges || []).map(hydrateEdge);
            setNodes(nextNodes);
            setEdges(nextEdges);
          } catch {}
        }}
      />
      <div className="workspace">
        <header className="top-nav">
          <div className="top-nav__content">
            <span className="top-nav__brand">Langgram Studio</span>
            <button
              type="button"
              className="top-nav__menu-toggle"
              aria-label="Abrir menú de acciones"
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              aria-controls={topNavActionsId}
              onClick={toggleTopNavMenu}
            >
              <FiMenu className="hamburger-nav-bar" />
            </button>
            <div id={topNavActionsId} className={topNavActionsClassName}>
              {user && (
                <button
                  type="button"
                  className="top-nav__button top-nav__button--secondary"
                  onClick={handleSaveButtonClick}
                >
                  Guardar diagrama
                </button>
              )}
              <button
                type="button"
                className="top-nav__button top-nav__button--secondary"
                onClick={handleGenerateButtonClick}
              >
                Generar código
              </button>
              <ProfileMenu />
            </div>
          </div>
        </header>

        <div className="canvas-wrapper">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            edgeTypes={edgeTypes}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </div>

      {contextMenu.open && (
        <div
          className="filter-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          role="menu"
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            type="button"
            className="filter-context-menu__item"
            onClick={handleContextMenuEdit}
          >
            Editar filtro
          </button>
          <button
            type="button"
            className="filter-context-menu__item filter-context-menu__item--danger"
            onClick={handleContextMenuDelete}
          >
            Borrar del diagrama
          </button>
        </div>
      )}

      {/* Alert de Material-UI */}
      {alert.open && (
        <Stack sx={{ position: "fixed", top: 16, right: 16, zIndex: 1000 }}>
          <Alert
            severity={alert.severity}
            onClose={() => setAlert({ ...alert, open: false })}
          >
            {alert.message}
          </Alert>
        </Stack>
      )}

      <Modal
        open={isCodeDialogOpen}
        onClose={handleCloseCodeDialog}
        aria-labelledby="generated-code-modal"
        aria-describedby="generated-code-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 800,
            maxWidth: "95vw",
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 2,
            p: 3,
            outline: "none",
            height: "90vh",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography id="generated-code-modal" variant="h6" component="h2">
              Código generado
            </Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={handleCloseCodeDialog}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {isGeneratingCode ? (
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress aria-label="Generando código" />
            </Box>
          ) : (
            <>
              <Tabs
                value="implementation"
                aria-label="Tabs del código generado"
                sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
              >
                <Tab label="Implementation" value="implementation" />
              </Tabs>

              <Box
                sx={{
                  flex: 1,
                  minHeight: "60vh",
                  maxHeight: "calc(90vh - 200px)",
                  border: "1px solid",
                  borderColor: "divider",
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
                  value={generatedCode}
                  onChange={setGeneratedCode}
                  theme="vs-dark"
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

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleDownloadCode}
                  disabled={!generatedCode.trim()}
                  sx={{ textTransform: "none" }}
                >
                  Descargar código
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>

      {/* Save Diagram Name Dialog */}
      <Modal
        open={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        aria-labelledby="save-diagram-modal"
        aria-describedby="save-diagram-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 500,
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 2,
            p: 4,
            outline: "none",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography id="save-diagram-modal" variant="h6" component="h2">
              Guardar Diagrama
            </Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={() => setIsSaveDialogOpen(false)}
              aria-label="close"
              sx={{ ml: 2 }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              id="diagram-name"
              label="Nombre del diagrama"
              variant="outlined"
              value={diagramName}
              onChange={(e) => setDiagramName(e.target.value)}
              placeholder="Mi diagrama"
              margin="normal"
              autoFocus
              sx={{ mb: 2 }}
            />
          </Box>

          <Box
            sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 3 }}
          >
            <Button
              variant="contained"
              onClick={saveDiagram}
              disabled={!diagramName.trim()}
              sx={{ textTransform: "none" }}
            >
              Guardar
            </Button>
            <Button
              variant="outlined"
              onClick={() => setIsSaveDialogOpen(false)}
              sx={{ textTransform: "none" }}
            >
              Cancelar
            </Button>
          </Box>
        </Box>
      </Modal>
      <CustomModal
        isVisible={filterEditor.open}
        onClose={closeFilterEditor}
        onSave={handleFilterSave}
        initialCode={filterEditor.code}
        initialName={filterEditor.name}
        title="Configurar filtro condicional"
        nameLabel="Nombre del filtro"
        saveLabel="Guardar filtro"
        cancelLabel="Cancelar"
      />
    </div>
  );
}

const DiagramWithProviders = () => (
  <ReactFlowProvider>
    <DnDProvider>
      <Diagram />
    </DnDProvider>
  </ReactFlowProvider>
);

export default DiagramWithProviders;
