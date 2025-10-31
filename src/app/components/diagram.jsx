"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import {
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  Controls,
  useReactFlow,
} from "reactflow";
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
import DiagramResourcePanel from "./DiagramResourcePanel";
import SaveDiagramModal from "./SaveDiagramModal";
import {
  Alert,
  Stack,
  Modal,
  Box,
  Typography,
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
    data: {
      label: "START",
      nodeType: "START",
      prompts: [],
      chains: [],
      tools: [],
    },
  },
  {
    id: "n2",
    type: "langgramNode",
    position: { x: 0, y: 100 },
    data: { label: "END", nodeType: "END", prompts: [], chains: [], tools: [] },
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

const initialResources = {
  prompts: [],
  chains: [],
  tools: [],
};

const cloneInitialNodes = () =>
  initialNodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      prompts: Array.isArray(node.data?.prompts) ? [...node.data.prompts] : [],
      chains: Array.isArray(node.data?.chains) ? [...node.data.chains] : [],
      tools: Array.isArray(node.data?.tools) ? [...node.data.tools] : [],
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

const truncateText = (value, maxLength = 80) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.length > maxLength
    ? `${value.slice(0, Math.max(0, maxLength - 1))}…`
    : value;
};

function Diagram() {
  const { data: session } = useSession();
  const user = session?.user ?? null;
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [diagramResources, setDiagramResources] = useState(() => ({
    ...initialResources,
  }));
  const [stategraphCode, setStategraphCode] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeResourcePanelTab, setActiveResourcePanelTab] =
    useState("resources");
  const [isResourcePanelOpen, setIsResourcePanelOpen] = useState(false);
  const resourcePrompts = useMemo(
    () =>
      Array.isArray(diagramResources.prompts) ? diagramResources.prompts : [],
    [diagramResources]
  );
  const resourceChains = useMemo(
    () =>
      Array.isArray(diagramResources.chains) ? diagramResources.chains : [],
    [diagramResources]
  );
  const resourceTools = useMemo(
    () => (Array.isArray(diagramResources.tools) ? diagramResources.tools : []),
    [diagramResources]
  );
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
  const [generatedFiles, setGeneratedFiles] = useState(null);
  const [activeGeneratedTab, setActiveGeneratedTab] = useState("agent.py");
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
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

  const generatedFileEntries = useMemo(
    () => (generatedFiles ? Object.entries(generatedFiles) : []),
    [generatedFiles]
  );

  const activeFileContent = useMemo(() => {
    if (!generatedFiles || !activeGeneratedTab) {
      return "";
    }
    return generatedFiles[activeGeneratedTab] ?? "";
  }, [activeGeneratedTab, generatedFiles]);

  const activeFileLanguage = useMemo(() => {
    if (!activeGeneratedTab) {
      return "plaintext";
    }
    if (activeGeneratedTab.endsWith(".py")) {
      return "python";
    }
    if (activeGeneratedTab.endsWith(".json")) {
      return "json";
    }
    if (activeGeneratedTab.endsWith(".txt")) {
      return "plaintext";
    }
    return "plaintext";
  }, [activeGeneratedTab]);

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

  useEffect(() => {
    if (!Array.isArray(edges) || edges.length === 0) {
      return;
    }

    const groups = new Map();
    edges.forEach((edge, index) => {
      if (edge?.type !== "conditionalEdge") {
        return;
      }
      const groupId =
        edge.data?.conditionalGroupId || `conditional-${edge.source}`;
      if (!groups.has(groupId)) {
        groups.set(groupId, []);
      }
      groups.get(groupId).push({ edge, index, groupId });
    });

    if (groups.size === 0) {
      return;
    }

    const nodePositions = new Map(
      nodes.map((node) => [node.id, node?.position?.x ?? 0])
    );

    const nextEdges = [...edges];
    let hasChanges = false;

    groups.forEach((entries) => {
      if (entries.length < 2) {
        entries.forEach(({ edge, index }) => {
          const cleanRestData = { ...(edge.data ?? {}) };
          delete cleanRestData.conditionalGroupId;
          delete cleanRestData.conditionalCount;
          delete cleanRestData.conditionalIndex;
          delete cleanRestData.conditionalPrimary;
          delete cleanRestData.conditionalOffset;
          delete cleanRestData.conditionalBranchDistance;

          if (
            edge.type === "conditionalEdge" ||
            edge.data?.conditionalGroupId
          ) {
            nextEdges[index] = {
              ...edge,
              type: "filterEdge",
              data: cleanRestData,
            };
            hasChanges = true;
          }
        });
        return;
      }

      const sortedEntries = [...entries];
      sortedEntries.sort((a, b) => {
        const posA = nodePositions.get(a.edge.target) ?? 0;
        const posB = nodePositions.get(b.edge.target) ?? 0;
        if (posA === posB) {
          return a.index - b.index;
        }
        return posA - posB;
      });

      sortedEntries.forEach(({ edge, index, groupId }, idx) => {
        const baseData = edge.data ?? {};
        const nextData = {
          ...baseData,
          conditionalGroupId: groupId,
          conditionalCount: sortedEntries.length,
          conditionalIndex: idx,
          conditionalPrimary: idx === 0,
        };

        let updatedEdge = edge;
        let shouldReplace = false;

        if (
          baseData.conditionalGroupId !== nextData.conditionalGroupId ||
          baseData.conditionalCount !== nextData.conditionalCount ||
          baseData.conditionalIndex !== nextData.conditionalIndex ||
          baseData.conditionalPrimary !== nextData.conditionalPrimary
        ) {
          updatedEdge = {
            ...updatedEdge,
            data: nextData,
          };
          shouldReplace = true;
        }

        if (edge.type !== "conditionalEdge") {
          updatedEdge = {
            ...updatedEdge,
            type: "conditionalEdge",
          };
          shouldReplace = true;
        }

        if (shouldReplace) {
          nextEdges[index] = updatedEdge;
          hasChanges = true;
        }
      });
    });

    if (hasChanges) {
      setEdges(nextEdges);
    }
  }, [edges, nodes, setEdges]);

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
      conditionalEdge: (edgeProps) => (
        <FilterEdge
          {...edgeProps}
          variant="conditional"
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
          tools: [],
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

  const isResourceDrag =
    dragPayload?.kind === "prompt" ||
    dragPayload?.kind === "chain" ||
    dragPayload?.kind === "tool";

  const handleResourceDragOver = useCallback(
    (event) => {
      if (!isResourceDrag) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
    },
    [isResourceDrag]
  );

  const handleResourceDrop = useCallback(
    (event) => {
      if (!isResourceDrag || !dragPayload) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const listKey =
        dragPayload.kind === "prompt"
          ? "prompts"
          : dragPayload.kind === "chain"
          ? "chains"
          : "tools";
      const nextEntry = (() => {
        if (dragPayload.kind === "prompt") {
          return { name: dragPayload.name, content: dragPayload.content ?? "" };
        }
        if (dragPayload.kind === "chain") {
          return { name: dragPayload.name, code: dragPayload.code ?? "" };
        }
        return {
          name: dragPayload.name,
          code: dragPayload.code ?? "",
          description: dragPayload.description ?? "",
        };
      })();

      setDiagramResources((prev) => {
        const currentList = Array.isArray(prev[listKey]) ? prev[listKey] : [];
        const nextList = [...currentList];
        const existingIndex = nextList.findIndex(
          (entry) => entry.name === nextEntry.name
        );

        if (existingIndex !== -1) {
          nextList[existingIndex] = nextEntry;
        } else {
          nextList.push(nextEntry);
        }

        return {
          ...prev,
          [listKey]: nextList,
        };
      });

      resetDrag();
    },
    [dragPayload, isResourceDrag, resetDrag, setDiagramResources]
  );

  const handleRemoveResource = useCallback((kind, name) => {
    const keyMap = {
      prompt: "prompts",
      chain: "chains",
      tool: "tools",
    };
    const listKey = keyMap[kind];
    if (!listKey) {
      return;
    }
    setDiagramResources((prev) => {
      const currentList = Array.isArray(prev[listKey]) ? prev[listKey] : [];
      return {
        ...prev,
        [listKey]: currentList.filter((entry) => entry.name !== name),
      };
    });
  }, []);

  const handleResourcePanelTab = useCallback(
    (tab) => {
      setIsResourcePanelOpen((prevOpen) => {
        if (prevOpen && activeResourcePanelTab === tab) {
          return false;
        }

        return true;
      });
      setActiveResourcePanelTab(tab);
    },
    [activeResourcePanelTab]
  );

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
      tools: Array.isArray(n.data?.tools) ? n.data.tools : [],
    }));

    const edgeData = edges.map((e) => ({
      source: e.source,
      target: e.target,
      id: e.id,
      type: e.type,
      filterCode: e.data?.filterCode || "",
      filterName: e.data?.filterName || "",
    }));

    const resourcePrompts = Array.isArray(diagramResources.prompts)
      ? diagramResources.prompts.map((prompt) => ({ ...prompt }))
      : [];
    const resourceChains = Array.isArray(diagramResources.chains)
      ? diagramResources.chains.map((chain) => ({ ...chain }))
      : [];
    const resourceTools = Array.isArray(diagramResources.tools)
      ? diagramResources.tools.map((tool) => ({ ...tool }))
      : [];

    const graphJSON = {
      StateGraph: {
        label: "StateGraph",
        code: stategraphCode ?? "",
      },
      nodes: nodeData,
      edges: edgeData,
      resources: {
        prompts: resourcePrompts,
        chains: resourceChains,
        tools: resourceTools,
      },
    };
    return graphJSON;
  }, [diagramResources, edges, nodes, stategraphCode]);

  const generateCodeWithAI = useCallback(async () => {
    const graphJSON = GraphJSON();
    try {
      const files = await generateCodeFromGraph(graphJSON);
      setGeneratedFiles(files);
      const firstFile = Object.keys(files ?? {})[0];
      if (firstFile) {
        setActiveGeneratedTab(firstFile);
      }
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
    if (!generatedFiles || !activeGeneratedTab) {
      return;
    }

    const content = generatedFiles[activeGeneratedTab] ?? "";
    if (!content.trim()) {
      return;
    }

    const getMimeType = (filename) => {
      if (filename.endsWith(".py")) {
        return "text/x-python;charset=utf-8";
      }
      if (filename.endsWith(".json")) {
        return "application/json;charset=utf-8";
      }
      return "text/plain;charset=utf-8";
    };

    const blob = new Blob([content], {
      type: getMimeType(activeGeneratedTab),
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = activeGeneratedTab;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Mostrar confirmación
    setAlert({
      message: `Archivo ${activeGeneratedTab} descargado correctamente`,
      severity: "success",
      open: true,
    });
  }, [generatedFiles, activeGeneratedTab]);

  const handleGeneratedFileChange = useCallback((filename, value) => {
    setGeneratedFiles((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        [filename]: value || "",
      };
    });
  }, []);

  const handleGeneratedTabChange = useCallback((_, value) => {
    setActiveGeneratedTab(value);
  }, []);

  useEffect(() => {
    if (!generatedFiles) {
      return;
    }

    if (!activeGeneratedTab || !(activeGeneratedTab in generatedFiles)) {
      const [firstFile] = Object.keys(generatedFiles);
      if (firstFile) {
        setActiveGeneratedTab(firstFile);
      }
    }
  }, [activeGeneratedTab, generatedFiles]);

  const openSaveDialog = () => {
    setDiagramName("");
    setIsSaveDialogOpen(true);
  };

  const handleDiagramNameChange = useCallback((event) => {
    setDiagramName(event.target.value);
  }, []);

  const handleGenerateButtonClick = useCallback(() => {
    closeTopNavMenu();
    setGeneratedFiles(null);
    setActiveGeneratedTab("agent.py");
    setIsCodeDialogOpen(true);
    setIsGeneratingCode(true);
    generateCodeWithAI();
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
            const tools = Array.isArray(n.tools) ? n.tools : [];
            return {
              id: n.id,
              type: "langgramNode",
              position: n.position || { x: 0, y: 0 },
              data: {
                label,
                nodeType,
                prompts,
                chains,
                tools,
              },
              code: n.code ?? "",
            };
          });
          const nextEdges = (storedGraph.edges || []).map(hydrateEdge);
          setNodes(nextNodes);
          setEdges(nextEdges);
          const storedResources = storedGraph.resources || {};
          const storedPrompts = Array.isArray(storedResources.prompts)
            ? storedResources.prompts.map((prompt) => ({ ...prompt }))
            : [];
          const storedChains = Array.isArray(storedResources.chains)
            ? storedResources.chains.map((chain) => ({ ...chain }))
            : [];
          const storedTools = Array.isArray(storedResources.tools)
            ? storedResources.tools.map((tool) => ({ ...tool }))
            : [];
          const storedStateGraph = storedGraph.StateGraph || {};
          setStategraphCode(() => {
            if (
              storedStateGraph &&
              typeof storedStateGraph === "object" &&
              typeof storedStateGraph.code === "string"
            ) {
              return storedStateGraph.code;
            }

            if (typeof storedStateGraph === "string") {
              return storedStateGraph;
            }

            return "";
          });
          setDiagramResources({
            prompts: storedPrompts,
            chains: storedChains,
            tools: storedTools,
          });
        } catch (error) {
          console.error(
            "Error al hidratar el diagrama desde el almacenamiento local:",
            error
          );
        }
      } else {
        setDiagramResources(() => ({ ...initialResources }));
        setStategraphCode("");
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
      setDiagramResources(() => ({ ...initialResources }));
      setAlert({ message: "", severity: "success", open: false });
      setIsMenuOpen(false);
      setStategraphCode("");
      setIsSaveDialogOpen(false);
      setDiagramName("");
      closeFilterEditor();
      closeFilterContextMenu();
      resetDrag();
      setIsResourcePanelOpen(false);
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
          const tools = Array.isArray(n.tools) ? n.tools : [];
          return {
            id: n.id,
            type: "langgramNode",
            position: n.position || { x: 0, y: 0 },
            data: {
              label,
              nodeType,
              prompts,
              chains,
              tools,
            },
            code: n.code ?? "",
          };
        });
        const nextEdges = (graph.edges || []).map(hydrateEdge);
        setNodes(nextNodes);
        setEdges(nextEdges);
        const resources = graph.resources || {};
        const graphPrompts = Array.isArray(resources.prompts)
          ? resources.prompts.map((prompt) => ({ ...prompt }))
          : [];
        const graphChains = Array.isArray(resources.chains)
          ? resources.chains.map((chain) => ({ ...chain }))
          : [];
        const graphTools = Array.isArray(resources.tools)
          ? resources.tools.map((tool) => ({ ...tool }))
          : [];
        setDiagramResources({
          prompts: graphPrompts,
          chains: graphChains,
          tools: graphTools,
        });
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
              const tools = Array.isArray(n.tools) ? n.tools : [];
              return {
                id: n.id,
                type: "langgramNode",
                position: n.position || { x: 0, y: 0 },
                data: {
                  label,
                  nodeType,
                  prompts,
                  chains,
                  tools,
                },
                code: n.code ?? "",
              };
            });
            const nextEdges = (graph.edges || []).map(hydrateEdge);
            setNodes(nextNodes);
            setEdges(nextEdges);
            const resources = graph.resources || {};
            const graphPrompts = Array.isArray(resources.prompts)
              ? resources.prompts.map((prompt) => ({ ...prompt }))
              : [];
            const graphChains = Array.isArray(resources.chains)
              ? resources.chains.map((chain) => ({ ...chain }))
              : [];
            const graphTools = Array.isArray(resources.tools)
              ? resources.tools.map((tool) => ({ ...tool }))
              : [];
            setDiagramResources({
              prompts: graphPrompts,
              chains: graphChains,
              tools: graphTools,
            });
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
              <button
                type="button"
                className="top-nav__button top-nav__button--secondary"
                onClick={() => setShowJsonModal(true)}
              >
                Ver JSON
              </button>
              <ProfileMenu />
            </div>
          </div>
        </header>

        {/* JSON Modal */}
        <Modal
          open={showJsonModal}
          onClose={() => setShowJsonModal(false)}
          aria-labelledby="json-modal-title"
          aria-describedby="json-modal-description"
        >
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "80%",
              maxWidth: "800px",
              maxHeight: "80vh",
              bgcolor: "background.paper",
              boxShadow: 24,
              p: 4,
              borderRadius: 1,
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
              <Typography id="json-modal-title" variant="h6" component="h2">
                Diagrama JSON
              </Typography>
              <IconButton onClick={() => setShowJsonModal(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Box
              sx={{
                flexGrow: 1,
                overflow: "auto",
                bgcolor: "#f5f5f5",
                p: 2,
                borderRadius: 1,
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {JSON.stringify(GraphJSON(), null, 2)}
            </Box>
            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                onClick={() => {
                  navigator.clipboard.writeText(
                    JSON.stringify(GraphJSON(), null, 2)
                  );
                  setAlert({
                    message: "JSON copiado al portapapeles",
                    severity: "success",
                    open: true,
                  });
                }}
                sx={{ mr: 1 }}
              >
                Copiar
              </Button>
              <Button
                variant="outlined"
                onClick={() => setShowJsonModal(false)}
              >
                Cerrar
              </Button>
            </Box>
          </Box>
        </Modal>

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

      <DiagramResourcePanel
        isOpen={isResourcePanelOpen}
        isResourceDrag={isResourceDrag}
        activeTab={activeResourcePanelTab}
        onSelectTab={handleResourcePanelTab}
        stategraphCode={stategraphCode}
        onStategraphChange={setStategraphCode}
        resourcePrompts={resourcePrompts}
        resourceChains={resourceChains}
        resourceTools={resourceTools}
        onDragOver={handleResourceDragOver}
        onDrop={handleResourceDrop}
        onRemoveResource={handleRemoveResource}
      />
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
                value={
                  generatedFileEntries.length > 0 ? activeGeneratedTab : false
                }
                onChange={handleGeneratedTabChange}
                aria-label="Tabs del código generado"
                sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
              >
                {generatedFileEntries.map(([filename]) => (
                  <Tab key={filename} label={filename} value={filename} />
                ))}
              </Tabs>

              {generatedFileEntries.length === 0 ? (
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "60vh",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No se generaron archivos.
                  </Typography>
                </Box>
              ) : (
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
                    language={activeFileLanguage}
                    value={activeFileContent}
                    onChange={(value) =>
                      handleGeneratedFileChange(activeGeneratedTab, value ?? "")
                    }
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
              )}

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleDownloadCode}
                  disabled={!activeFileContent.trim()}
                  sx={{ textTransform: "none" }}
                >
                  Descargar archivo
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>

      {/* Save Diagram Name Dialog */}
      <SaveDiagramModal
        open={isSaveDialogOpen}
        diagramName={diagramName}
        onDiagramNameChange={handleDiagramNameChange}
        onSave={saveDiagram}
        onClose={() => setIsSaveDialogOpen(false)}
      />

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
