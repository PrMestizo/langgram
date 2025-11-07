"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import {
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
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
import FilterNode from "./FilterNode";
import FilterNodeActionsContext from "./FilterNodeActionsContext";
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
const TEMPLATE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const coerceTemplateId = (rawValue) => {
  if (rawValue === undefined || rawValue === null) {
    return null;
  }

  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return null;
    }
    if (TEMPLATE_ID_PATTERN.test(trimmed)) {
      return trimmed;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "string") {
        return coerceTemplateId(parsed);
      }
    } catch (error) {
      // Ignore JSON parse errors and continue coercion attempts below.
    }
    return null;
  }

  if (typeof rawValue === "object") {
    if (typeof rawValue.id === "string") {
      return coerceTemplateId(rawValue.id);
    }
    return null;
  }

  const coerced = String(rawValue).trim();
  if (!coerced) {
    return null;
  }
  return TEMPLATE_ID_PATTERN.test(coerced) ? coerced : null;
};

let filterNodeId = 0;
const getFilterNodeId = () => `filter_${filterNodeId++}`;

const FILTER_NODE_TYPE = "filterNode";
const FILTER_NODE_KIND = "FILTER";
const FILTER_NODE_DEFAULT_LABEL = "Filtro";

const buildFilterNode = ({
  id: nodeId = getFilterNodeId(),
  position = { x: 0, y: 0 },
  filterCode = "",
  filterName = "",
  filterTemplateId = null,
  label,
  draggable = true,
} = {}) => ({
  id: nodeId,
  type: FILTER_NODE_TYPE,
  position,
  draggable,
  data: {
    nodeType: FILTER_NODE_KIND,
    label: label ?? filterName || FILTER_NODE_DEFAULT_LABEL,
    filterCode,
    filterName,
    filterTemplateId: coerceTemplateId(filterTemplateId),
  },
});

const isFilterNode = (node) =>
  node?.type === FILTER_NODE_TYPE || node?.data?.nodeType === FILTER_NODE_KIND;

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
  buildFilterNode({
    id: "filter_n1_n2",
    position: { x: 0, y: 50 },
    filterCode: "",
    filterName: "",
    filterTemplateId: null,
    draggable: false,
  }),
  {
    id: "n2",
    type: "langgramNode",
    position: { x: 0, y: 100 },
    data: { label: "END", nodeType: "END", prompts: [], chains: [], tools: [] },
  },
];

const initialEdges = [
  {
    id: "n1-filter_n1_n2",
    source: "n1",
    target: "filter_n1_n2",
    type: "smoothstep",
  },
  {
    id: "filter_n1_n2-n2",
    source: "filter_n1_n2",
    target: "n2",
    type: "smoothstep",
  },
];

const initialResources = {
  prompts: [],
  chains: [],
  tools: [],
};

const cloneInitialNodes = () =>
  initialNodes.map((node) => {
    if (isFilterNode(node)) {
      return buildFilterNode({
        id: node.id,
        position: { ...node.position },
        filterCode: node.data?.filterCode ?? "",
        filterName: node.data?.filterName ?? "",
        filterTemplateId: node.data?.filterTemplateId ?? null,
        label: node.data?.label ?? FILTER_NODE_DEFAULT_LABEL,
        draggable: node.draggable ?? true,
      });
    }

    return {
      ...node,
      data: {
        ...node.data,
        prompts: Array.isArray(node.data?.prompts) ? [...node.data.prompts] : [],
        chains: Array.isArray(node.data?.chains) ? [...node.data.chains] : [],
        tools: Array.isArray(node.data?.tools) ? [...node.data.tools] : [],
      },
      code: node.code ?? "",
    };
  });

const cloneInitialEdges = () => initialEdges.map((edge) => ({ ...edge }));

const hydrateConnectionEdge = (edge) => ({
  id: edge.id || `${edge.source}-${edge.target}`,
  source: edge.source,
  target: edge.target,
  type: edge.type || "smoothstep",
});

const deserializeGraphNodes = (graphNodes = []) =>
  graphNodes.map((n) => {
    const nodeType = n.nodeType ?? n.type ?? n.componentType;
    if (nodeType === FILTER_NODE_KIND || n.componentType === FILTER_NODE_TYPE) {
      return buildFilterNode({
        id: n.id,
        position: n.position || { x: 0, y: 0 },
        filterCode: n.filterCode ?? n.data?.filterCode ?? "",
        filterName: n.filterName ?? n.data?.filterName ?? "",
        filterTemplateId:
          n.filterTemplateId ?? n.data?.filterTemplateId ?? null,
        draggable: n.draggable ?? true,
      });
    }

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

const deserializeGraph = (graph) => {
  const baseNodes = deserializeGraphNodes(graph?.nodes || []);
  const nodeMap = new Map(baseNodes.map((node) => [node.id, node]));
  const filterNodeIds = new Set(
    baseNodes.filter(isFilterNode).map((node) => node.id)
  );

  const edgesResult = [];
  const filterNodes = [];
  const edgeEntries = Array.isArray(graph?.edges) ? graph.edges : [];

  edgeEntries.forEach((edge, index) => {
    if (!edge || !edge.source || !edge.target) {
      return;
    }

    const hasFilterPayload =
      edge.type === "filterEdge" ||
      Boolean(
        edge.filterCode ||
          edge.filterName ||
          edge.filterTemplateId ||
          edge?.data?.filterCode ||
          edge?.data?.filterName ||
          edge?.data?.filterTemplateId
      );

    if (hasFilterPayload) {
      const baseId = edge.id ? String(edge.id) : null;
      let filterNodeId = baseId && baseId.trim() ? baseId : null;
      if (!filterNodeId || filterNodeIds.has(filterNodeId)) {
        const fallbackId = `filter_${edge.source}_${edge.target}_${index}`;
        filterNodeId = filterNodeIds.has(fallbackId) ? fallbackId : filterNodeId || fallbackId;
      }

      if (!filterNodeIds.has(filterNodeId)) {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        const sourcePosition = sourceNode?.position ?? { x: 0, y: 0 };
        const targetPosition = targetNode?.position ?? { x: 0, y: 0 };
        const position = {
          x: (sourcePosition.x + targetPosition.x) / 2,
          y: (sourcePosition.y + targetPosition.y) / 2,
        };
        const filterNode = buildFilterNode({
          id: filterNodeId,
          position,
          filterCode: edge.filterCode ?? edge.data?.filterCode ?? "",
          filterName: edge.filterName ?? edge.data?.filterName ?? "",
          filterTemplateId:
            edge.filterTemplateId ?? edge.data?.filterTemplateId ?? null,
        });
        filterNodes.push(filterNode);
        nodeMap.set(filterNode.id, filterNode);
        filterNodeIds.add(filterNode.id);
      }

      const edgeType = edge.connectionType ?? edge.type ?? "smoothstep";
      edgesResult.push(
        hydrateConnectionEdge({
          id: `${edge.source}-${filterNodeId}-${index}-a`,
          source: edge.source,
          target: filterNodeId,
          type: edgeType,
        })
      );
      edgesResult.push(
        hydrateConnectionEdge({
          id: `${filterNodeId}-${edge.target}-${index}-b`,
          source: filterNodeId,
          target: edge.target,
          type: edgeType,
        })
      );
      return;
    }

    edgesResult.push(
      hydrateConnectionEdge({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
      })
    );
  });

  return {
    nodes: [...baseNodes, ...filterNodes],
    edges: edgesResult,
  };
};

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
  const [nodes, setNodes] = useState(() => cloneInitialNodes());
  const [edges, setEdges] = useState(() => cloneInitialEdges());
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
  const { screenToFlowPosition, getNode } = useReactFlow();
  const nodeTypes = useMemo(
    () => ({
      langgramNode: NodeWithAttachments,
      [FILTER_NODE_TYPE]: FilterNode,
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
    nodeId: null,
    name: "",
    code: "",
    templateId: null,
  });

  const [contextMenu, setContextMenu] = useState({
    open: false,
    nodeId: null,
    x: 0,
    y: 0,
  });

  const openFilterContextMenu = useCallback((nodeId, position) => {
    setContextMenu({ open: true, nodeId, x: position.x, y: position.y });
  }, []);

  const closeFilterContextMenu = useCallback(() => {
    setContextMenu({ open: false, nodeId: null, x: 0, y: 0 });
  }, []);

  const handleFilterClick = useCallback(
    (nodeId) => {
      const targetNode = nodes.find((node) => node.id === nodeId);
      if (!targetNode || !isFilterNode(targetNode)) {
        return;
      }
      setFilterEditor({
        open: true,
        nodeId,
        name: targetNode.data?.filterName ?? "",
        code: targetNode.data?.filterCode ?? "",
        templateId:
          targetNode.data?.filterTemplateId ??
          targetNode.data?.templateId ??
          null,
      });
    },
    [nodes]
  );

  const closeFilterEditor = useCallback(() => {
    setFilterEditor({
      open: false,
      nodeId: null,
      name: "",
      code: "",
      templateId: null,
    });
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
      if (!filterEditor.nodeId) {
        return;
      }

      const trimmedName = (updatedName || "").trim();
      const finalName = trimmedName || "Filtro sin nombre";

      const targetNode = nodes.find((node) => node.id === filterEditor.nodeId);
      if (!targetNode || !isFilterNode(targetNode)) {
        return;
      }

      const resolvedTemplateId = coerceTemplateId(
        filterEditor.templateId ??
          targetNode.data?.filterTemplateId ??
          targetNode.data?.templateId ??
          null
      );
      const isUpdate = Boolean(resolvedTemplateId);
      const payload = {
        name: finalName,
        code: updatedCode,
        ...(isUpdate ? { id: resolvedTemplateId } : {}),
      };

      try {
        const res = await fetch("/api/edges", {
          method: isUpdate ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Error al guardar el filtro");
        }
        const saved = await res.json();
        const nextTemplateId = coerceTemplateId(
          saved?.id ??
            resolvedTemplateId ??
            targetNode.data?.filterTemplateId ??
            null
        );
        setNodes((prevNodes) =>
          prevNodes.map((node) => {
            if (node.id !== filterEditor.nodeId || !isFilterNode(node)) {
              return node;
            }
            return {
              ...node,
              data: {
                ...node.data,
                filterCode: updatedCode,
                filterName: finalName,
                filterTemplateId: nextTemplateId,
              },
            };
          })
        );

        setFilterEditor((prev) =>
          prev.nodeId === filterEditor.nodeId
            ? {
                ...prev,
                name: finalName,
                code: updatedCode,
                templateId: nextTemplateId,
              }
            : prev
        );

        const eventDetail = saved ?? { ...payload, id: nextTemplateId };

        window.dispatchEvent(
          new CustomEvent("edges-updated", { detail: eventDetail })
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
    [
      filterEditor.nodeId,
      filterEditor.templateId,
      nodes,
      setAlert,
      setFilterEditor,
      setNodes,
    ]
  );

  useEffect(() => {
    if (!filterEditor.open) {
      return;
    }

    const nodeStillExists = nodes.some(
      (node) => node.id === filterEditor.nodeId && isFilterNode(node)
    );
    if (!nodeStillExists) {
      closeFilterEditor();
    }
  }, [
    closeFilterEditor,
    filterEditor.nodeId,
    filterEditor.open,
    nodes,
  ]);

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

  const handleApplyFilterFromDrag = useCallback(
    (nodeId, filter) => {
      if (!nodeId || !filter) {
        return;
      }

      setNodes((prevNodes) =>
        prevNodes.map((node) =>
          node.id === nodeId && isFilterNode(node)
            ? {
                ...node,
                data: {
                  ...node.data,
                  filterCode: filter.code ?? node.data?.filterCode ?? "",
                  filterName: filter.name ?? node.data?.filterName ?? "",
                  filterTemplateId: coerceTemplateId(
                    filter.templateId ??
                      filter.id ??
                      node.data?.filterTemplateId ??
                      null
                  ),
                },
              }
            : node
        )
      );
      setFilterEditor((prev) =>
        prev.nodeId === nodeId
          ? {
              ...prev,
              name: filter.name ?? "",
              code: filter.code ?? "",
              templateId: coerceTemplateId(
                filter.templateId ?? filter.id ?? prev.templateId ?? null
              ),
            }
          : prev
      );
    },
    [setFilterEditor, setNodes]
  );

  const selectFilterNode = useCallback(
    (nodeId) => {
      if (!nodeId) {
        return;
      }
      setNodes((prevNodes) =>
        prevNodes.map((node) => ({
          ...node,
          selected: node.id === nodeId && isFilterNode(node),
        }))
      );
      setEdges((prevEdges) =>
        prevEdges.map((edge) => ({ ...edge, selected: false }))
      );
    },
    [setEdges, setNodes]
  );

  const filterNodeActions = useMemo(
    () => ({
      onEditFilter: handleFilterClick,
      onOpenContextMenu: openFilterContextMenu,
      onApplyFilter: handleApplyFilterFromDrag,
      onSelectFilter: selectFilterNode,
    }),
    [
      handleApplyFilterFromDrag,
      handleFilterClick,
      openFilterContextMenu,
      selectFilterNode,
    ]
  );

  const handleEdgeClick = useCallback(
    (event, edge) => {
      if (event?.defaultPrevented) {
        return;
      }
      setEdges((prevEdges) =>
        prevEdges.map((existingEdge) => ({
          ...existingEdge,
          selected: existingEdge.id === edge?.id,
        }))
      );
      setNodes((prevNodes) =>
        prevNodes.map((node) => ({ ...node, selected: false }))
      );
    },
    [setEdges, setNodes]
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
    (params) => {
      if (!params?.source || !params?.target) {
        return;
      }

      const sourceNode = getNode(params.source);
      const targetNode = getNode(params.target);
      const sourcePosition = sourceNode?.position ?? { x: 0, y: 0 };
      const targetPosition = targetNode?.position ?? { x: 0, y: 0 };
      const position = {
        x: (sourcePosition.x + targetPosition.x) / 2,
        y: (sourcePosition.y + targetPosition.y) / 2,
      };
      let filterNodeId = getFilterNodeId();
      setNodes((prevNodes) => {
        let candidateId = filterNodeId;
        while (prevNodes.some((node) => node.id === candidateId)) {
          candidateId = getFilterNodeId();
        }
        filterNodeId = candidateId;
        return [
          ...prevNodes,
          buildFilterNode({
            id: candidateId,
            position,
          }),
        ];
      });

      const edgeType = params.type ?? "smoothstep";
      const firstEdgeId = `${params.source}-${filterNodeId}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const secondEdgeId = `${filterNodeId}-${params.target}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      setEdges((prevEdges) => [
        ...prevEdges,
        hydrateConnectionEdge({
          id: firstEdgeId,
          source: params.source,
          target: filterNodeId,
          type: edgeType,
        }),
        hydrateConnectionEdge({
          id: secondEdgeId,
          source: filterNodeId,
          target: params.target,
          type: edgeType,
        }),
      ]);
    },
    [getNode, setEdges, setNodes]
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
    const filterNodeIds = new Set(
      nodes.filter(isFilterNode).map((node) => node.id)
    );

    const nodeData = nodes
      .filter((n) => !filterNodeIds.has(n.id))
      .map((n) => ({
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

    const filterEdges = nodes
      .filter(isFilterNode)
      .map((filterNode) => {
        const incoming = edges.find((edge) => edge.target === filterNode.id);
        const outgoing = edges.find((edge) => edge.source === filterNode.id);
        if (!incoming || !outgoing) {
          return null;
        }
        return {
          source: incoming.source,
          target: outgoing.target,
          id: filterNode.id,
          type: "filterEdge",
          filterCode: filterNode.data?.filterCode || "",
          filterName: filterNode.data?.filterName || "",
          filterTemplateId: coerceTemplateId(
            filterNode.data?.filterTemplateId
          ),
        };
      })
      .filter(Boolean);

    const structuralEdges = edges
      .filter(
        (edge) =>
          !filterNodeIds.has(edge.source) && !filterNodeIds.has(edge.target)
      )
      .map((edge) => ({
        source: edge.source,
        target: edge.target,
        id: edge.id,
        type: edge.type,
      }));

    const edgeData = [...filterEdges, ...structuralEdges];

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
          const { nodes: nextNodes, edges: nextEdges } = deserializeGraph(
            storedGraph
          );
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
      filterNodeId = 0;
      id = 0;
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

  const handleClearFilterFromNode = useCallback(
    (nodeId) => {
      setNodes((prevNodes) =>
        prevNodes.map((node) =>
          node.id === nodeId && isFilterNode(node)
            ? {
                ...node,
                data: {
                  ...node.data,
                  filterCode: "",
                  filterName: "",
                  filterTemplateId: null,
                },
              }
            : node
        )
      );

      if (filterEditor.nodeId === nodeId) {
        closeFilterEditor();
      }
    },
    [closeFilterEditor, filterEditor.nodeId]
  );

  const handleContextMenuEdit = useCallback(() => {
    if (!contextMenu.nodeId) {
      return;
    }

    const targetNodeId = contextMenu.nodeId;
    closeFilterContextMenu();
    handleFilterClick(targetNodeId);
  }, [closeFilterContextMenu, contextMenu.nodeId, handleFilterClick]);

  const handleContextMenuDelete = useCallback(() => {
    if (!contextMenu.nodeId) {
      return;
    }

    const targetNodeId = contextMenu.nodeId;
    handleClearFilterFromNode(targetNodeId);
    closeFilterContextMenu();
  }, [closeFilterContextMenu, contextMenu.nodeId, handleClearFilterFromNode]);

  // Listen for external load requests from the Sidebar
  // Expected payload: { nodes: [{id,type,label,position,code}], edges: [{id,source,target}] }
  // Rebuilds React Flow state accordingly
  useEffect(() => {
    const handler = (ev) => {
      const graph = ev?.detail;
      if (!graph) return;
      try {
        const { nodes: nextNodes, edges: nextEdges } = deserializeGraph(graph);
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
            const { nodes: nextNodes, edges: nextEdges } =
              deserializeGraph(graph);
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
          <FilterNodeActionsContext.Provider value={filterNodeActions}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onEdgeClick={handleEdgeClick}
              nodeTypes={nodeTypes}
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>
          </FilterNodeActionsContext.Provider>
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
        title="Configurar filtro"
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
