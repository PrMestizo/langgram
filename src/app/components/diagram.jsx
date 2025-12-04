"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import { ConditionalNode } from "./conditional_node";
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
  ControlButton,
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
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import SearchIcon from "@mui/icons-material/Search";
import { FiMenu } from "react-icons/fi";
import {
  loadPersistedDiagram,
  savePersistedDiagram,
} from "../lib/diagramStorage";
import ProfileMenu from "./ProfileMenu";
import dagre from "dagre";

let id = 0;
const getId = () => `dndnode_${id++}`;

const DAGRE_LAYOUT_CONFIG = {
  rankdir: "TB",
  align: "UL",
  nodesep: 50,
  ranksep: 100,
};

const DEFAULT_NODE_DIMENSIONS = {
  width: 260,
  height: 150,
};

const getNodeDimensions = (node) => {
  const widthCandidate =
    parseFloat(node?.measured?.width) ||
    parseFloat(node?.width) ||
    parseFloat(node?.style?.width);
  const heightCandidate =
    parseFloat(node?.measured?.height) ||
    parseFloat(node?.height) ||
    parseFloat(node?.style?.height);

  return {
    width: Number.isFinite(widthCandidate)
      ? widthCandidate
      : DEFAULT_NODE_DIMENSIONS.width,
    height: Number.isFinite(heightCandidate)
      ? heightCandidate
      : DEFAULT_NODE_DIMENSIONS.height,
  };
};

const layoutWithDagre = (nodes, edges) => {
  if (!nodes.length) {
    return nodes;
  }

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ ...DAGRE_LAYOUT_CONFIG });

  nodes.forEach((node) => {
    const { width, height } = getNodeDimensions(node);
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    if (edge.source && edge.target) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const layoutNode = dagreGraph.node(node.id);
    if (!layoutNode) {
      return node;
    }

    const { width, height } = getNodeDimensions(node);
    const x = layoutNode.x - width / 2;
    const y = layoutNode.y - height / 2;

    return {
      ...node,
      position: { x, y },
      positionAbsolute: { x, y },
    };
  });
};

const DND_NODE_ID_PATTERN = /^dndnode_(\d+)$/;

const syncNodeIdCounter = (nodes) => {
  if (!Array.isArray(nodes)) {
    id = 0;
    return;
  }

  const highestId = nodes.reduce((max, node) => {
    if (!node || typeof node.id !== "string") {
      return max;
    }

    const match = DND_NODE_ID_PATTERN.exec(node.id);
    if (!match) {
      return max;
    }

    const numericId = Number.parseInt(match[1], 10);
    if (Number.isNaN(numericId)) {
      return max;
    }

    return Math.max(max, numericId);
  }, -1);

  id = Math.max(0, highestId + 1);
};

const extractStategraphCode = (graph) => {
  if (!graph || typeof graph !== "object") {
    return "";
  }

  const stategraphSource =
    graph.StateGraph ??
    graph.stateGraph ??
    graph.stategraph ??
    graph.state_graph ??
    graph.stategraphCode ??
    graph.stategraph_code;

  if (typeof stategraphSource === "string") {
    return stategraphSource;
  }

  if (stategraphSource && typeof stategraphSource === "object") {
    if (typeof stategraphSource.code === "string") {
      return stategraphSource.code;
    }
    if (typeof stategraphSource.content === "string") {
      return stategraphSource.content;
    }
    if (typeof stategraphSource.value === "string") {
      return stategraphSource.value;
    }
  }

  return "";
};

const extractGraphResources = (graph) => {
  if (!graph || typeof graph !== "object") {
    return { prompts: [], chains: [], tools: [] };
  }

  const rawResources =
    (graph.resources &&
      typeof graph.resources === "object" &&
      graph.resources) ||
    (graph.Resources &&
      typeof graph.Resources === "object" &&
      graph.Resources) ||
    {};

  const coerceList = (value) =>
    Array.isArray(value) ? value.map((entry) => ({ ...entry })) : [];

  const prompts = coerceList(
    rawResources.prompts ?? rawResources.Prompts ?? rawResources.prompt
  );
  const chains = coerceList(
    rawResources.chains ?? rawResources.Chains ?? rawResources.chain
  );
  const tools = coerceList(
    rawResources.tools ?? rawResources.Tools ?? rawResources.tool
  );

  return { prompts, chains, tools };
};

const extractGraphComplements = (graph) => {
  const fallback = cloneInitialComplements();
  if (!graph || typeof graph !== "object") {
    return fallback;
  }

  const rawComplements =
    (graph.complements &&
      typeof graph.complements === "object" &&
      graph.complements) ||
    (graph.Complements &&
      typeof graph.Complements === "object" &&
      graph.Complements) ||
    (graph.resources &&
      typeof graph.resources === "object" &&
      typeof graph.resources.complements === "object" &&
      graph.resources.complements) ||
    {};

  const memorySource =
    rawComplements.memory ||
    rawComplements.Memory ||
    rawComplements.memoria ||
    {};

  const enabled =
    typeof memorySource.enabled === "boolean"
      ? memorySource.enabled
      : typeof memorySource.active === "boolean"
      ? memorySource.active
      : false;

  const codeCandidate =
    typeof memorySource.code === "string" ? memorySource.code : null;

  return {
    memory: {
      enabled,
      code:
        codeCandidate && codeCandidate.trim()
          ? codeCandidate
          : enabled
          ? MEMORY_ENABLED_SNIPPET
          : MEMORY_DISABLED_SNIPPET,
    },
  };
};

const normalizeGraphNodes = (graphNodes = []) => {
  const mappedNodes = graphNodes
    .map((node) => {
      if (!node || typeof node !== "object") {
        return null;
      }

      const existingData =
        node.data && typeof node.data === "object" ? { ...node.data } : {};

      const isConditionalNode = Boolean(
        (typeof node.componentType === "string" &&
          node.componentType === "conditionalNode") ||
          (typeof existingData.componentType === "string" &&
            existingData.componentType === "conditionalNode") ||
          (typeof node.nodeType === "string" &&
            node.nodeType === "conditionalNode") ||
          (typeof existingData.nodeType === "string" &&
            existingData.nodeType === "conditionalNode") ||
          (typeof node.type === "string" && node.type === "conditionalNode") ||
          (typeof existingData.type === "string" &&
            existingData.type === "conditionalNode") ||
          node?.conditionalEdge === true ||
          existingData?.conditionalEdge === true ||
          node?.data?.conditionalEdge === true
      );

      const storedComponentType = isConditionalNode
        ? (typeof node.componentType === "string" && node.componentType) ||
          (typeof existingData.componentType === "string" &&
            existingData.componentType) ||
          (typeof node.type === "string" && node.type) ||
          "conditionalNode"
        : "langgramNode";

      const storedNodeType =
        (typeof existingData.nodeType === "string" && existingData.nodeType) ||
        (typeof node.nodeType === "string" && node.nodeType) ||
        (typeof node.type === "string" && node.type) ||
        (typeof existingData.type === "string" && existingData.type) ||
        storedComponentType;

      const storedLabel =
        (typeof existingData.label === "string" && existingData.label) ||
        (typeof node.label === "string" && node.label) ||
        (typeof node.name === "string" && node.name) ||
        (typeof storedNodeType === "string" && storedNodeType) ||
        "";

      const promptsSource = Array.isArray(node.prompts)
        ? node.prompts
        : Array.isArray(existingData.prompts)
        ? existingData.prompts
        : [];
      const chainsSource = Array.isArray(node.chains)
        ? node.chains
        : Array.isArray(existingData.chains)
        ? existingData.chains
        : [];
      const toolsSource = Array.isArray(node.tools)
        ? node.tools
        : Array.isArray(existingData.tools)
        ? existingData.tools
        : [];

      const prompts = promptsSource.map((prompt) => ({ ...prompt }));
      const chains = chainsSource.map((chain) => ({ ...chain }));
      const tools = toolsSource.map((tool) => ({ ...tool }));

      const position =
        node.position && typeof node.position === "object"
          ? { ...node.position }
          : { x: 0, y: 0 };

      const normalizedNode = {
        id: node.id,
        type: storedComponentType,
        position,
        data: {
          ...existingData,
          componentType: storedComponentType,
          label: storedLabel,
          nodeType: storedNodeType,
          prompts,
          chains,
          tools,
          conditionalEdge: isConditionalNode,
        },
        code:
          typeof node.code === "string"
            ? node.code
            : typeof existingData.code === "string"
            ? existingData.code
            : "",
      };

      if (typeof node.name === "string") {
        normalizedNode.name = node.name;
      }

      return normalizedNode;
    })
    .filter(Boolean);

  syncNodeIdCounter(mappedNodes);

  return mappedNodes;
};

const initialNodes = [
  {
    id: "START",
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
    id: "END",
    type: "langgramNode",
    position: { x: 0, y: 300 },
    data: { label: "END", nodeType: "END", prompts: [], chains: [], tools: [] },
  },
];

const initialEdges = [];

const MEMORY_ENABLED_SNIPPET = [
  "# Complemento Memory activado",
  "# El chatbot recordará el historial de la conversación.",
  "from langchain.memory import ConversationBufferMemory",
  "",
  "chat_memory = ConversationBufferMemory(",
  '    memory_key="chat_history",',
  "    return_messages=True,",
  ")",
].join("\n");

const MEMORY_DISABLED_SNIPPET = [
  "# Complemento Memory desactivado",
  "# El chatbot no conservará el historial de la conversación.",
  "chat_memory = None",
].join("\n");

const initialResources = {
  prompts: [],
  chains: [],
  tools: [],
};

const initialComplements = {
  memory: {
    enabled: false,
    code: MEMORY_DISABLED_SNIPPET,
  },
};

const cloneInitialComplements = () => ({
  memory: { ...initialComplements.memory },
});

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

const hydrateEdge = (edge) => ({
  id: edge.id || `${edge.source}-${edge.target}`,
  source: edge.source,
  target: edge.target,
  type: edge.type || "filterEdge",
  data: {
    ...(edge.data || {}),
    filterCode: edge.filterCode ?? edge.data?.filterCode ?? "",
    filterName: edge.filterName ?? edge.data?.filterName ?? "",
    filterTemplateId:
      edge.filterTemplateId ??
      edge.data?.filterTemplateId ??
      edge.templateId ??
      edge.data?.templateId ??
      null,
  },
});

const topNavActionsId = "top-nav-actions";

function Diagram() {
  const { data: session } = useSession();
  const user = session?.user ?? null;
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [diagramResources, setDiagramResources] = useState(() => ({
    ...initialResources,
  }));
  const [complements, setComplements] = useState(() =>
    cloneInitialComplements()
  );
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
  const { screenToFlowPosition, fitView, getEdges } = useReactFlow();

  const layoutAndFitView = useCallback(
    (nodesToLayout, edgesToLayout) => {
      const layoutedNodes = layoutWithDagre(nodesToLayout, edgesToLayout);
      requestAnimationFrame(() => {
        fitView({ padding: 0.2, includeHiddenNodes: true });
      });
      return layoutedNodes;
    },
    [fitView]
  );

  const scheduleLayoutWithMeasuredNodes = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setNodes((currentNodes) => layoutAndFitView(currentNodes, getEdges()));
      });
    });
  }, [getEdges, layoutAndFitView, setNodes]);

  const applyGraphData = useCallback(
    (graph) => {
      if (!graph || typeof graph !== "object") {
        return;
      }

      try {
        const nextNodes = normalizeGraphNodes(graph.nodes);
        const nextEdges = (graph.edges || []).map(hydrateEdge);
        const layoutedNodes = layoutAndFitView(nextNodes, nextEdges);

        setNodes(layoutedNodes);
        setEdges(nextEdges);
        setStategraphCode(extractStategraphCode(graph));
        setDiagramResources(extractGraphResources(graph));
        setComplements(extractGraphComplements(graph));

        scheduleLayoutWithMeasuredNodes();
      } catch (error) {
        console.error("Error applying graph data:", error);
      }
    },
    [layoutAndFitView, scheduleLayoutWithMeasuredNodes]
  );

  const handleAutoLayout = useCallback(() => {
    setNodes((currentNodes) => layoutAndFitView(currentNodes, getEdges()));
  }, [getEdges, layoutAndFitView, setNodes]);

  const nodeTypes = useMemo(
    () => ({
      langgramNode: NodeWithAttachments,
      conditionalNode: ConditionalNode,
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
  const [currentDiagramTitle, setCurrentDiagramTitle] = useState("Untitled");
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
    templateId: null,
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
        templateId:
          targetEdge?.data?.filterTemplateId ??
          targetEdge?.data?.templateId ??
          null,
      });
    },
    [edges]
  );

  const closeFilterEditor = useCallback(() => {
    setFilterEditor({
      open: false,
      edgeId: null,
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
      if (!filterEditor.edgeId) {
        return;
      }

      const trimmedName = (updatedName || "").trim();
      const finalName = trimmedName || "Filtro sin nombre";

      const targetEdge = edges.find((edge) => edge.id === filterEditor.edgeId);
      const resolvedTemplateId = coerceTemplateId(
        filterEditor.templateId ??
          targetEdge?.data?.filterTemplateId ??
          targetEdge?.data?.templateId ??
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
            targetEdge?.data?.filterTemplateId ??
            null
        );
        setEdges((prevEdges) =>
          prevEdges.map((edge) =>
            edge.id === filterEditor.edgeId
              ? {
                  ...edge,
                  data: {
                    ...edge.data,
                    filterCode: updatedCode,
                    filterName: finalName,
                    filterTemplateId: nextTemplateId,
                  },
                }
              : edge
          )
        );

        setFilterEditor((prev) =>
          prev.edgeId === filterEditor.edgeId
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
      filterEditor.edgeId,
      filterEditor.templateId,
      setEdges,
      setAlert,
      setFilterEditor,
    ]
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
  }, [edges, filterEditor.open, filterEditor.edgeId, closeFilterEditor]);

  useEffect(() => {
    const handleNodeUpdate = (event) => {
      const { oldName, newName } = event.detail;
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (node.data?.label === oldName) {
            return {
              ...node,
              data: {
                ...node.data,
                label: newName,
                nodeType: newName, // Assuming nodeType also tracks the name for custom nodes
              },
            };
          }
          return node;
        })
      );
    };

    const handleChainUpdate = (event) => {
      const { oldName, newName } = event.detail;
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          const updatedChains = (node.data?.chains || []).map((chain) =>
            chain.name === oldName ? { ...chain, name: newName } : chain
          );
          return {
            ...node,
            data: {
              ...node.data,
              chains: updatedChains,
            },
          };
        })
      );
    };

    const handleToolUpdate = (event) => {
      const { oldName, newName } = event.detail;
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          const updatedTools = (node.data?.tools || []).map((tool) =>
            tool.name === oldName ? { ...tool, name: newName } : tool
          );
          return {
            ...node,
            data: {
              ...node.data,
              tools: updatedTools,
            },
          };
        })
      );
    };

    const handlePromptUpdate = (event) => {
      const { oldName, newName } = event.detail;
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          const updatedPrompts = (node.data?.prompts || []).map((prompt) =>
            prompt.name === oldName ? { ...prompt, name: newName } : prompt
          );
          return {
            ...node,
            data: {
              ...node.data,
              prompts: updatedPrompts,
            },
          };
        })
      );
    };

    window.addEventListener("node-updated", handleNodeUpdate);
    window.addEventListener("chain-updated", handleChainUpdate);
    window.addEventListener("tool-updated", handleToolUpdate);
    window.addEventListener("prompt-updated", handlePromptUpdate);

    return () => {
      window.removeEventListener("node-updated", handleNodeUpdate);
      window.removeEventListener("chain-updated", handleChainUpdate);
      window.removeEventListener("tool-updated", handleToolUpdate);
      window.removeEventListener("prompt-updated", handlePromptUpdate);
    };
  }, []);

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
                  filterTemplateId: coerceTemplateId(
                    filter.id ?? edge.data?.filterTemplateId ?? null
                  ),
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
              templateId: coerceTemplateId(
                filter.id ?? prev.templateId ?? null
              ),
            }
          : prev
      );
    },
    [setEdges, setFilterEditor]
  );

  const selectEdge = useCallback(
    (edgeId) => {
      if (!edgeId) {
        return;
      }
      setEdges((prevEdges) =>
        prevEdges.map((edge) => ({
          ...edge,
          selected: edge.id === edgeId,
        }))
      );
      setNodes((prevNodes) =>
        prevNodes.map((node) => ({ ...node, selected: false }))
      );
    },
    [setEdges, setNodes]
  );

  const handleEdgeClick = useCallback(
    (event, edge) => {
      if (event?.defaultPrevented) {
        return;
      }
      selectEdge(edge?.id);
    },
    [selectEdge]
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
          onSelectEdge={selectEdge}
        />
      ),
    }),
    [
      handleApplyFilterFromDrag,
      handleFilterClick,
      openFilterContextMenu,
      selectEdge,
    ]
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
            data: { filterCode: "", filterName: "", filterTemplateId: null },
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
      const isConditionalDrag = dragPayload?.type === "conditionalNode";
      const isStart = dragPayload?.type === "START";
      const isEnd = dragPayload?.type === "END";

      let nodeId = getId();
      if (isStart) nodeId = "START";
      if (isEnd) nodeId = "END";

      // Check if START or END already exists
      if ((isStart || isEnd) && nodes.some((n) => n.id === nodeId)) {
        setAlert({
          message: `El nodo ${nodeId} ya existe en el diagrama.`,
          severity: "warning",
          open: true,
        });
        resetDrag();
        return;
      }

      const label = dragPayload?.name ?? dragPayload?.type;
      const newNode = {
        id: nodeId,
        type: isConditionalDrag ? "conditionalNode" : "langgramNode",
        position,
        data: {
          label,
          nodeType: dragPayload?.type,
          prompts: [],
          chains: [],
          tools: [],
          conditionalEdge: isConditionalDrag,
        },
        code: dragPayload?.code ?? "",
      };

      setNodes((nds) => nds.concat(newNode));
      resetDrag();
    },
    [dragPayload, resetDrag, screenToFlowPosition, setNodes, nodes]
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

  const handleToggleMemoryComplement = useCallback((nextValue) => {
    setComplements((prev) => {
      const currentMemory = prev.memory ?? initialComplements.memory;
      const nextEnabled = Boolean(nextValue);
      let nextCode = currentMemory.code;

      if (nextEnabled) {
        const trimmedCode =
          typeof currentMemory.code === "string"
            ? currentMemory.code.trim()
            : "";
        if (!trimmedCode || trimmedCode === MEMORY_DISABLED_SNIPPET) {
          nextCode = MEMORY_ENABLED_SNIPPET;
        }
      } else {
        nextCode = MEMORY_DISABLED_SNIPPET;
      }

      if (
        currentMemory.enabled === nextEnabled &&
        currentMemory.code === nextCode
      ) {
        return prev;
      }

      return {
        ...prev,
        memory: {
          ...currentMemory,
          enabled: nextEnabled,
          code: nextCode,
        },
      };
    });
  }, []);

  const GraphJSON = useCallback(() => {
    const nodeIdMap = new Map();
    const nodeData = nodes.map((n, index) => {
      let nodeId = `node_${index + 1}`;
      if (n.id === "START" || n.id === "END") {
        nodeId = n.id;
      }
      nodeIdMap.set(n.id, nodeId);
      return {
        id: nodeId,
        type: n.data?.nodeType ?? n.type,
        componentType: n.type,
        label: n.data?.label ?? n.data?.nodeType ?? "",
        position: n.position,
        code: n.code ?? "",
        prompts: Array.isArray(n.data?.prompts)
          ? n.data.prompts.map((prompt) => ({ ...prompt }))
          : [],
        chains: Array.isArray(n.data?.chains)
          ? n.data.chains.map((chain) => ({ ...chain }))
          : [],
        tools: Array.isArray(n.data?.tools)
          ? n.data.tools.map((tool) => ({ ...tool }))
          : [],
      };
    });

    const edgeData = edges.map((e, index) => {
      const edgeId = `edge_${index + 1}`;
      return {
        source: nodeIdMap.get(e.source) ?? e.source,
        target: nodeIdMap.get(e.target) ?? e.target,
        id: edgeId,
        type: e.type,
        filterCode: e.data?.filterCode || "",
        filterName: e.data?.filterName || "",
        filterTemplateId: coerceTemplateId(e.data?.filterTemplateId),
      };
    });

    const withSequentialIds = (items, prefix) =>
      Array.isArray(items)
        ? items.map((item, index) => ({
            ...item,
            id: `${prefix}_${index + 1}`,
          }))
        : [];

    const resourcePrompts = withSequentialIds(
      diagramResources.prompts,
      "prompt"
    );
    const resourceChains = withSequentialIds(diagramResources.chains, "chain");
    const resourceTools = withSequentialIds(diagramResources.tools, "tool");

    const memoryComplement = complements?.memory ?? initialComplements.memory;
    const normalizedMemory = {
      enabled: Boolean(memoryComplement?.enabled),
      code:
        typeof memoryComplement?.code === "string" &&
        memoryComplement.code.trim()
          ? memoryComplement.code
          : memoryComplement?.enabled
          ? MEMORY_ENABLED_SNIPPET
          : MEMORY_DISABLED_SNIPPET,
    };

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
      complements: {
        memory: normalizedMemory,
      },
    };
    return graphJSON;
  }, [complements, diagramResources, edges, nodes, stategraphCode]);

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

  const handleDiagramLoad = useCallback(
    (diagramPayload) => {
      const graph =
        diagramPayload?.graph ?? diagramPayload?.content ?? diagramPayload;

      if (graph) {
        applyGraphData(graph);
      }

      const incomingName = diagramPayload?.name;
      setCurrentDiagramTitle(incomingName?.trim() || "Untitled");
      setDiagramName(incomingName || "");
    },
    [applyGraphData]
  );

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
      setCurrentDiagramTitle(name);

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
        applyGraphData(storedGraph);
      } else {
        setDiagramResources(() => ({ ...initialResources }));
        setComplements(cloneInitialComplements());
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
  }, [applyGraphData]);

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

  const resetDiagram = useCallback(() => {
    const initialClone = cloneInitialNodes();
    syncNodeIdCounter(initialClone);
    setNodes(initialClone);
    setEdges(cloneInitialEdges());
    setDiagramResources(() => ({ ...initialResources }));
    setComplements(cloneInitialComplements());
    setAlert({ message: "", severity: "success", open: false });
    setIsMenuOpen(false);
    setStategraphCode("");
    setIsSaveDialogOpen(false);
    setDiagramName("");
    setCurrentDiagramTitle("Untitled");
    closeFilterEditor();
    closeFilterContextMenu();
    resetDrag();
    setIsResourcePanelOpen(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fitView({ padding: 0.2, includeHiddenNodes: true });
      });
    });
  }, [closeFilterContextMenu, closeFilterEditor, resetDrag, fitView]);

  useEffect(() => {
    window.addEventListener("reset-diagram", resetDiagram);
    return () => {
      window.removeEventListener("reset-diagram", resetDiagram);
    };
  }, [resetDiagram]);

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
                  filterTemplateId: null,
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
      const detail = ev?.detail;
      handleDiagramLoad(detail);
    };
    window.addEventListener("load-diagram", handler);
    return () => window.removeEventListener("load-diagram", handler);
  }, [handleDiagramLoad]);

  const displayedDiagramTitle = currentDiagramTitle?.trim() || "Untitled";

  return (
    <div className="dndflow">
      <Sidebar onLoadDiagram={handleDiagramLoad} />
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
              {/* Botón Guardar diagrama eliminado a petición del usuario */}
              <button
                type="button"
                className="top-nav__button top-nav__button--secondary"
                onClick={handleGenerateButtonClick}
              >
                Generar código
              </button>
              {/* Botón Ordenar eliminado a petición del usuario */}
              <button
                type="button"
                className="top-nav__button top-nav__button--secondary"
                onClick={() => setShowJsonModal(true)}
              >
                Ver JSON
              </button>
              <button
                type="button"
                className="top-nav__button top-nav__button--secondary"
                onClick={resetDiagram}
              >
                Reset
              </button>
              <ProfileMenu />
            </div>
          </div>
        </header>

        <section className="diagram-section-header" aria-label="Diagram header">
          <div className="diagram-section-header__left">
            <span className="diagram-section-header__label">Diagram</span>
            <h2 className="diagram-section-header__title">
              {displayedDiagramTitle}
            </h2>
          </div>
          <div className="diagram-section-header__actions">
            <button
              type="button"
              className="diagram-section-header__action diagram-section-header__action--link"
              onClick={handleSaveButtonClick}
              disabled={!user}
            >
              <SaveOutlinedIcon fontSize="small" />
              <span>Save diagram</span>
            </button>
            <div className="diagram-section-header__search" role="search">
              <SearchIcon className="diagram-section-header__search-icon" />
              <input
                type="search"
                placeholder="Search in diagram"
                className="diagram-section-header__search-input"
                aria-label="Search in diagram"
              />
            </div>
          </div>
        </section>

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
            onEdgeClick={handleEdgeClick}
            edgeTypes={edgeTypes}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls className="diagram-controls">
              <ControlButton
                onClick={handleAutoLayout}
                title="Ordenar diagrama"
                className="diagram-controls__button"
              >
                Ordenar
              </ControlButton>
            </Controls>
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
        memoryComplement={complements.memory}
        onToggleMemory={handleToggleMemoryComplement}
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
