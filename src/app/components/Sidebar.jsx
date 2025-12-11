// Sidebar.jsx
"use client";
import * as React from "react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import Box from "@mui/material/Box";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDnD } from "./DnDContext";
import LongMenu from "./KebabMenu";
import CustomModal from "./Modal";
import { FaFilter, FaStore, FaPlus, FaCircle } from "react-icons/fa";
import { MdOutlineSchema } from "react-icons/md";
import { IfIcon } from "./icons/IfIcon";
import { HiLink } from "react-icons/hi";
import { FiTool } from "react-icons/fi";
import { TbPrompt } from "react-icons/tb";
import { GiCrossedChains } from "react-icons/gi";
import { AiOutlineSetting, AiOutlineMenu } from "react-icons/ai";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useSpring, animated } from "@react-spring/web";
import Collapse from "@mui/material/Collapse";

const Sidebar = ({ onLoadDiagram }) => {
  const { setType, setCode, setDragPayload } = useDnD();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupMode, setPopupMode] = useState("node");
  const [customDiagrams, setCustomDiagrams] = useState([]);
  const [customNodes, setCustomNodes] = useState([]);
  const [customEdges, setCustomEdges] = useState([]);
  const [customPrompts, setCustomPrompts] = useState([]);
  const [customChains, setCustomChains] = useState([]);
  const [customTools, setCustomTools] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [modalInitialName, setModalInitialName] = useState("");
  const [modalInitialCode, setModalInitialCode] = useState("");
  const [modalInitialConditionalEdge, setModalInitialConditionalEdge] =
    useState(false);
  const [editingContext, setEditingContext] = useState(null);
  const isEditing = Boolean(editingContext);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [anchorElAdd, setAnchorElAdd] = useState(null);
  const openAddMenu = Boolean(anchorElAdd);
  const router = useRouter();

  const modalConfigs = {
    node: {
      title: "Editor de nodo personalizado",
      editTitle: "Editar nodo personalizado",
      nameLabel: "Nombre",
      namePlaceholder: "Nombre del nodo",
      initialCode:
        "# Edita el código del nodo a tus necesidades:\n\n# Función mínima para un nodo\ndef mi_nodo(state):\n    return state\n# debe devolver el estado (o algo mergeable con él)",
      language: "python",
      editorType: "code",
    },
    edge: {
      title: "Editor de arista personalizada",
      editTitle: "Editar arista personalizada",
      nameLabel: "Nombre",
      namePlaceholder: "Nombre de la arista",
      initialCode:
        "# Define tu arista personalizada aquí\n# def mi_arista(source, target, state):\n#     return state\n",
      language: "python",
      editorType: "code",
    },
    prompt: {
      title: "Nuevo prompt personalizado",
      editTitle: "Editar prompt personalizado",
      nameLabel: "Nombre",
      namePlaceholder: "Nombre del prompt",
      initialCode: "",
      editorType: "code",
      language: "markdown",
      contentLabel: "Contenido del prompt",
    },
    chain: {
      title: "Nueva chain personalizada",
      editTitle: "Editar chain personalizada",
      nameLabel: "Nombre",
      namePlaceholder: "Nombre de la chain",
      initialCode:
        "# Define aquí la lógica de tu chain personalizada\n# def mi_chain(state):\n#     return state\n",
      language: "python",
      editorType: "code",
    },
    tool: {
      title: "Nueva tool personalizada",
      editTitle: "Editar tool personalizada",
      nameLabel: "Nombre",
      namePlaceholder: "Nombre de la tool",
      initialCode:
        "# Define aquí tu tool personalizada\n# def mi_tool(state):\n#     return state\n",
      language: "python",
      editorType: "code",
    },
    diagram: {
      title: "Editar diagrama guardado",
      editTitle: "Editar diagrama guardado",
      nameLabel: "Nombre",
      namePlaceholder: "Nombre del diagrama",
      initialCode: "{\n  \n}",
      language: "json",
      editorType: "code",
    },
  };

  const loadDiagrams = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    try {
      const res = await fetch("/api/diagrams?visibility=mine");
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setCustomDiagrams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar diagramas:", err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setCustomDiagrams([]);
      return;
    }

    loadDiagrams();

    // Escuchar eventos de actualización
    window.addEventListener("diagrams-updated", loadDiagrams);
    return () => {
      window.removeEventListener("diagrams-updated", loadDiagrams);
    };
  }, [isAuthenticated, loadDiagrams]);

  useEffect(() => {
    if (!isAuthenticated) {
      setCustomNodes([]);
      return;
    }
    const fetchNodes = async () => {
      try {
        const res = await fetch("/api/nodes?visibility=mine");
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        setCustomNodes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error al cargar nodos:", err);
      }
    };
    fetchNodes();
  }, [isAuthenticated]);

  useEffect(() => {
    const fetchEdges = async () => {
      if (!isAuthenticated) {
        setCustomEdges([]);
        return;
      }
      try {
        const res = await fetch("/api/edges?visibility=mine");
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        setCustomEdges(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error al cargar edges:", err);
      }
    };
    fetchEdges();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setCustomPrompts([]);
      return;
    }
    const fetchPrompts = async () => {
      try {
        const res = await fetch("/api/prompts?visibility=mine");
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        setCustomPrompts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error al cargar prompts:", err);
      }
    };
    fetchPrompts();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setCustomChains([]);
      return;
    }
    const fetchChains = async () => {
      try {
        const res = await fetch("/api/chains?visibility=mine");
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        setCustomChains(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error al cargar chains:", err);
      }
    };
    fetchChains();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setCustomTools([]);
      return;
    }
    const fetchTools = async () => {
      try {
        const res = await fetch("/api/tools?visibility=mine");
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        setCustomTools(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error al cargar tools:", err);
      }
    };
    fetchTools();
  }, [isAuthenticated]);

  useEffect(() => {
    const handleEdgesUpdated = (event) => {
      const savedEdge = event?.detail;
      if (!savedEdge) {
        return;
      }

      setCustomEdges((prev) => {
        const existsIndex = prev.findIndex((edge) => edge.id === savedEdge.id);
        if (existsIndex !== -1) {
          const next = [...prev];
          next[existsIndex] = savedEdge;
          return next;
        }
        return [...prev, savedEdge];
      });
    };

    window.addEventListener("edges-updated", handleEdgesUpdated);
    return () =>
      window.removeEventListener("edges-updated", handleEdgesUpdated);
  }, []);

  const onDragStart = (event, nodeType, nodeCode, nodeName) => {
    const payload = {
      kind: "node",
      type: nodeType,
      code: nodeCode || "",
      name: nodeName,
    };
    setType(nodeType);
    setCode(nodeCode);
    setDragPayload(payload);
    event.dataTransfer.setData("application/node-type", nodeType);
    event.dataTransfer.setData("application/node-code", nodeCode ?? "");
    event.dataTransfer.effectAllowed = "move";
  };

  const onEdgeDragStart = (
    event,
    edgeName,
    edgeCode,
    edgeType = "filterEdge",
    edgeId = null
  ) => {
    setType(null);
    setCode(null);
    const payload = {
      kind: "edge",
      type: edgeType,
      code: edgeCode || "",
      name: edgeName,
      id: edgeId,
    };
    setDragPayload(payload);
    event.dataTransfer.setData("application/edge-name", edgeName ?? "");
    event.dataTransfer.setData("application/edge-code", edgeCode ?? "");
    event.dataTransfer.setData("application/edge-id", edgeId);
    event.dataTransfer.effectAllowed = "copy";

    const preview = document.createElement("div");
    preview.className = "filter-drag-preview";
    preview.textContent = "ƒ";
    document.body.appendChild(preview);
    const { width, height } = preview.getBoundingClientRect();
    event.dataTransfer.setDragImage(preview, width / 2, height / 2);
    setTimeout(() => {
      if (preview.parentNode) {
        preview.parentNode.removeChild(preview);
      }
    }, 0);
  };

  const onPromptDragStart = (event, prompt) => {
    if (!prompt) {
      return;
    }
    setType(null);
    setCode(null);
    const payload = {
      kind: "prompt",
      type: "prompt",
      name: prompt.name,
      content: prompt.content ?? "",
    };
    setDragPayload(payload);
    event.dataTransfer.setData("application/prompt-name", prompt.name ?? "");
    event.dataTransfer.effectAllowed = "copy";
  };

  const onChainDragStart = (event, chain) => {
    if (!chain) {
      return;
    }
    setType(null);
    setCode(null);
    const payload = {
      kind: "chain",
      type: "chain",
      name: chain.name,
      code: chain.code ?? "",
    };
    setDragPayload(payload);
    event.dataTransfer.setData("application/chain-name", chain.name ?? "");
    event.dataTransfer.setData("application/chain-code", chain.code ?? "");
    event.dataTransfer.effectAllowed = "copy";
  };

  const onToolDragStart = (event, tool) => {
    if (!tool) {
      return;
    }
    setType(null);
    setCode(null);
    const payload = {
      kind: "tool",
      type: "tool",
      name: tool.name,
      code: tool.code ?? "",
      description: tool.description ?? "",
    };
    setDragPayload(payload);
    event.dataTransfer.setData("application/tool-name", tool.name ?? "");
    event.dataTransfer.setData("application/tool-code", tool.code ?? "");
    event.dataTransfer.effectAllowed = "copy";
  };

  const handleDragEnd = () => {
    setType(null);
    setCode(null);
    setDragPayload(null);
  };

  const popupAction = (mode = "node") => {
    setMenuOpenId(null);
    setEditingContext(null);
    setPopupMode(mode);
    setModalInitialName("");
    setModalInitialConditionalEdge(false);
    setModalInitialCode(modalConfigs[mode]?.initialCode ?? "");
    setIsPopupVisible(true);
  };

  const openModalForEdit = (mode, item) => {
    setMenuOpenId(null);
    setPopupMode(mode);
    setEditingContext({ type: mode, item });
    setModalInitialName(item?.name ?? "");

    if (mode === "prompt") {
      setModalInitialCode(item?.content ?? "");
    } else if (mode === "diagram") {
      const diagramContent = item?.content ?? item?.graph ?? {};
      const formattedContent =
        typeof diagramContent === "string"
          ? diagramContent
          : JSON.stringify(diagramContent, null, 2);
      setModalInitialCode(formattedContent);
    } else {
      setModalInitialCode(item?.code ?? "");
    }
    setModalInitialConditionalEdge(
      mode === "edge" ? !!item?.conditionalEdge : false
    );
    setIsPopupVisible(true);
  };

  const handleModalClose = () => {
    setIsPopupVisible(false);
    setEditingContext(null);
    setModalInitialName("");
    setModalInitialCode("");
    setModalInitialConditionalEdge(false);
  };

  const handleSaveCustomNode = async (code, nodeName) => {
    const newNode = { name: nodeName, code, language: "python" };
    try {
      const res = await fetch("/api/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNode),
      });
      const saved = await res.json();
      setCustomNodes((prev) => [...prev, saved]);
    } catch (err) {
      console.error("Error al guardar nodo:", err);
    }
  };

  const handleSaveCustomEdge = async (code, edgeName, conditionalEdge) => {
    const newEdge = {
      name: edgeName,
      code,
      language: "python",
      conditionalEdge: !!conditionalEdge,
    };
    try {
      const res = await fetch("/api/edges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEdge),
      });
      const saved = await res.json();
      setCustomEdges((prev) => [...prev, saved]);
    } catch (err) {
      console.error("Error al guardar edge:", err);
    }
  };

  const handleSaveCustomPrompt = async (content, promptName) => {
    const newPrompt = { name: promptName, content };
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPrompt),
      });
      const saved = await res.json();
      setCustomPrompts((prev) =>
        Array.isArray(prev) ? [...prev, saved] : [saved]
      );
    } catch (err) {
      console.error("Error al guardar prompt:", err);
    }
  };

  const handleSaveCustomChain = async (code, chainName) => {
    const newChain = { name: chainName, code, language: "python" };
    try {
      const res = await fetch("/api/chains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newChain),
      });
      const saved = await res.json();
      setCustomChains((prev) =>
        Array.isArray(prev) ? [...prev, saved] : [saved]
      );
    } catch (err) {
      console.error("Error al guardar chain:", err);
    }
  };

  const handleSaveCustomTool = async (code, toolName) => {
    const newTool = { name: toolName, code, language: "python" };
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTool),
      });
      const saved = await res.json();
      setCustomTools((prev) =>
        Array.isArray(prev) ? [...prev, saved] : [saved]
      );
    } catch (err) {
      console.error("Error al guardar tool:", err);
    }
  };

  const updateResourceVisibility = useCallback(
    async ({
      endpoint,
      item,
      nextValue,
      setState,
      resourceLabel,
      eventName,
    }) => {
      try {
        const res = await fetch(endpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, isPublic: nextValue }),
        });

        if (!res.ok) {
          const error = await res.json().catch(() => null);
          throw new Error(
            error?.details || `Error al actualizar ${resourceLabel}`
          );
        }

        const updated = await res.json();

        setState((prev) => {
          if (!Array.isArray(prev)) {
            return prev;
          }

          const exists = prev.some((entry) => entry.id === updated.id);
          if (!exists) {
            return prev;
          }

          return prev.map((entry) =>
            entry.id === updated.id ? { ...entry, ...updated } : entry
          );
        });

        if (eventName) {
          window.dispatchEvent(new CustomEvent(eventName, { detail: updated }));
        }
      } catch (err) {
        console.error(
          `Error al actualizar visibilidad de ${resourceLabel}:`,
          err
        );
        alert(
          `No se pudo actualizar la visibilidad del ${resourceLabel}. Inténtalo nuevamente.`
        );
      }
    },
    []
  );

  const handleToggleDiagramVisibility = useCallback(
    (diagram, nextValue) =>
      updateResourceVisibility({
        endpoint: "/api/diagrams",
        item: diagram,
        nextValue,
        setState: setCustomDiagrams,
        resourceLabel: "diagrama",
        eventName: "diagrams-updated",
      }),
    [updateResourceVisibility]
  );

  const handleToggleNodeVisibility = useCallback(
    (node, nextValue) =>
      updateResourceVisibility({
        endpoint: "/api/nodes",
        item: node,
        nextValue,
        setState: setCustomNodes,
        resourceLabel: "nodo",
      }),
    [updateResourceVisibility]
  );

  const handleToggleEdgeVisibility = useCallback(
    (edge, nextValue) =>
      updateResourceVisibility({
        endpoint: "/api/edges",
        item: edge,
        nextValue,
        setState: setCustomEdges,
        resourceLabel: "edge",
      }),
    [updateResourceVisibility]
  );

  const handleTogglePromptVisibility = useCallback(
    (prompt, nextValue) =>
      updateResourceVisibility({
        endpoint: "/api/prompts",
        item: prompt,
        nextValue,
        setState: setCustomPrompts,
        resourceLabel: "prompt",
      }),
    [updateResourceVisibility]
  );

  const handleToggleChainVisibility = useCallback(
    (chain, nextValue) =>
      updateResourceVisibility({
        endpoint: "/api/chains",
        item: chain,
        nextValue,
        setState: setCustomChains,
        resourceLabel: "chain",
      }),
    [updateResourceVisibility]
  );

  const handleToggleToolVisibility = useCallback(
    (tool, nextValue) =>
      updateResourceVisibility({
        endpoint: "/api/tools",
        item: tool,
        nextValue,
        setState: setCustomTools,
        resourceLabel: "tool",
      }),
    [updateResourceVisibility]
  );

  const handleUpdateCustomDiagram = async (diagram, code, diagramName) => {
    try {
      let parsedContent = {};
      if (code) {
        try {
          parsedContent = JSON.parse(code);
        } catch (parseError) {
          console.error("Error al parsear el diagrama:", parseError);
          alert("El contenido del diagrama debe ser un JSON válido.");
          return false;
        }
      }

      const payload = {
        id: diagram.id,
        name: diagramName,
        content: parsedContent,
      };

      const res = await fetch("/api/diagrams", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.details || "Error al actualizar diagrama");
      }

      const saved = await res.json();
      setCustomDiagrams((prev) =>
        prev.map((item) => (item.id === saved.id ? saved : item))
      );
      return true;
    } catch (err) {
      console.error("Error al actualizar diagrama:", err);
      alert(`No se pudo actualizar el diagrama: ${err.message}`);
      return false;
    }
  };

  const handleUpdateCustomNode = async (node, code, nodeName) => {
    try {
      const payload = {
        id: node.id,
        name: nodeName,
        code,
      };

      if (node.language) {
        payload.language = node.language;
      }

      const res = await fetch("/api/nodes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.details || "Error al actualizar nodo");
      }

      const saved = await res.json();
      setCustomNodes((prev) =>
        prev.map((item) => (item.id === saved.id ? saved : item))
      );
      window.dispatchEvent(
        new CustomEvent("node-updated", {
          detail: { oldName: node.name, newName: nodeName },
        })
      );
      return true;
    } catch (err) {
      console.error("Error al actualizar nodo:", err);
      alert(`No se pudo actualizar el nodo: ${err.message}`);
      return false;
    }
  };

  const handleUpdateCustomEdge = async (
    edge,
    code,
    edgeName,
    conditionalEdge
  ) => {
    try {
      const payload = {
        id: edge.id,
        name: edgeName,
        code,
        conditionalEdge: !!conditionalEdge,
      };

      if (edge.language) {
        payload.language = edge.language;
      }

      const res = await fetch("/api/edges", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.details || "Error al actualizar edge");
      }
      const saved = await res.json();
      setCustomEdges((prev) =>
        prev.map((item) => (item.id === saved.id ? saved : item))
      );
      return true;
    } catch (err) {
      console.error("Error al actualizar edge:", err);
      alert(`No se pudo actualizar el edge: ${err.message}`);
      return false;
    }
  };

  const handleUpdateCustomPrompt = async (prompt, content, promptName) => {
    try {
      const payload = {
        id: prompt.id,
        name: promptName,
        content,
      };

      const res = await fetch("/api/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.details || "Error al actualizar prompt");
      }

      const saved = await res.json();
      setCustomPrompts((prev) =>
        prev.map((item) => (item.id === saved.id ? saved : item))
      );
      window.dispatchEvent(
        new CustomEvent("prompt-updated", {
          detail: { oldName: prompt.name, newName: promptName },
        })
      );
      return true;
    } catch (err) {
      console.error("Error al actualizar prompt:", err);
      alert(`No se pudo actualizar el prompt: ${err.message}`);
      return false;
    }
  };

  const handleUpdateCustomChain = async (chain, code, chainName) => {
    try {
      const payload = {
        id: chain.id,
        name: chainName,
        code,
      };

      if (chain.language) {
        payload.language = chain.language;
      }

      const res = await fetch("/api/chains", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.details || "Error al actualizar chain");
      }

      const saved = await res.json();
      setCustomChains((prev) =>
        prev.map((item) => (item.id === saved.id ? saved : item))
      );
      window.dispatchEvent(
        new CustomEvent("chain-updated", {
          detail: { oldName: chain.name, newName: chainName },
        })
      );
      return true;
    } catch (err) {
      console.error("Error al actualizar chain:", err);
      alert(`No se pudo actualizar la chain: ${err.message}`);
      return false;
    }
  };

  const handleUpdateCustomTool = async (tool, code, toolName) => {
    try {
      const payload = {
        id: tool.id,
        name: toolName,
        code,
      };

      if (tool.language) {
        payload.language = tool.language;
      }

      const res = await fetch("/api/tools", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.details || "Error al actualizar tool");
      }

      const saved = await res.json();
      setCustomTools((prev) =>
        prev.map((item) => (item.id === saved.id ? saved : item))
      );
      window.dispatchEvent(
        new CustomEvent("tool-updated", {
          detail: { oldName: tool.name, newName: toolName },
        })
      );
      return true;
    } catch (err) {
      console.error("Error al actualizar tool:", err);
      alert(`No se pudo actualizar la tool: ${err.message}`);
      return false;
    }
  };

  // Unified save handler so we can also switch to the right tab after save
  const handleSaveFromPopup = (code, name, conditionalEdgeValue) => {
    if (editingContext) {
      const { type, item } = editingContext;
      if (type === "diagram") {
        return handleUpdateCustomDiagram(item, code, name);
      } else if (type === "edge") {
        return handleUpdateCustomEdge(item, code, name, conditionalEdgeValue);
      } else if (type === "prompt") {
        return handleUpdateCustomPrompt(item, code, name);
      } else if (type === "chain") {
        return handleUpdateCustomChain(item, code, name);
      } else if (type === "tool") {
        return handleUpdateCustomTool(item, code, name);
      } else {
        return handleUpdateCustomNode(item, code, name);
      }
    }

    if (popupMode === "edge") {
      handleSaveCustomEdge(code, name, conditionalEdgeValue);
      // selectPanelTab("edges"); // Removed tab switching
    } else if (popupMode === "prompt") {
      handleSaveCustomPrompt(code, name);
      // selectPanelTab("prompts"); // Removed tab switching
    } else if (popupMode === "chain") {
      handleSaveCustomChain(code, name);
      // selectPanelTab("chains"); // Removed tab switching
    } else if (popupMode === "tool") {
      handleSaveCustomTool(code, name);
      // selectPanelTab("tools"); // Removed tab switching
    } else {
      handleSaveCustomNode(code, name);
      // selectPanelTab("nodes"); // Removed tab switching
    }
    return true;
  };

  const handleEditCustomDiagram = (diagram) => {
    openModalForEdit("diagram", diagram);
  };

  const handleEditCustomNode = (node) => {
    openModalForEdit("node", node);
  };

  const handleEditCustomEdge = (edge) => {
    openModalForEdit("edge", edge);
  };

  const handleEditCustomPrompt = (prompt) => {
    openModalForEdit("prompt", prompt);
  };

  const handleEditCustomChain = (chain) => {
    openModalForEdit("chain", chain);
  };

  const handleEditCustomTool = (tool) => {
    openModalForEdit("tool", tool);
  };

  const handleDeleteCustomDiagram = async (diagramName) => {
    try {
      const diagramToDelete = customDiagrams.find(
        (diagram) => diagram.name === diagramName
      );
      const requestBody = diagramToDelete?.id
        ? { id: diagramToDelete.id, name: diagramName } // Enviar ambos por si acaso
        : { name: diagramName };

      console.log("Deleting diagram with:", requestBody); // Para debug

      const res = await fetch("/api/diagrams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("Server error:", error);
        throw new Error(error.details || "Error al eliminar diagram");
      }

      const deleted = await res.json();
      console.log("Diagram deleted successfully:", deleted);

      // Actualizar el estado local solo si el servidor confirmó la eliminación
      setCustomDiagrams((prev) =>
        prev.filter((diagram) => diagram.name !== diagramName)
      );
    } catch (err) {
      console.error("Error al eliminar diagram:", err);
      // Opcionalmente, mostrar un mensaje de error al usuario
      alert(`No se pudo eliminar el diagram: ${err.message}`);
    }
  };

  const handleDeleteCustomNode = async (nodeName) => {
    try {
      const nodeToDelete = customNodes.find((node) => node.name === nodeName);

      // Preparar el body con id si está disponible, si no usar name
      const requestBody = nodeToDelete?.id
        ? { id: nodeToDelete.id, name: nodeName } // Enviar ambos por si acaso
        : { name: nodeName };

      console.log("Deleting node with:", requestBody); // Para debug

      const res = await fetch("/api/nodes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("Server error:", error);
        throw new Error(error.details || "Error al eliminar nodo");
      }

      const deleted = await res.json();
      console.log("Node deleted successfully:", deleted);

      // Actualizar el estado local solo si el servidor confirmó la eliminación
      setCustomNodes((prev) => prev.filter((node) => node.name !== nodeName));
    } catch (err) {
      console.error("Error al eliminar nodo:", err);
      // Opcionalmente, mostrar un mensaje de error al usuario
      alert(`No se pudo eliminar el nodo: ${err.message}`);
    }
  };

  const handleDeleteCustomEdge = async (edgeName) => {
    try {
      const edgeToDelete = customEdges.find((edge) => edge.name === edgeName);

      if (!edgeToDelete) {
        console.error("Edge not found:", edgeName);
        throw new Error("No se encontró el edge para eliminar");
      }

      // Ensure we have either ID or name
      if (!edgeToDelete.id && !edgeToDelete.name) {
        console.error("No ID or name found for edge:", edgeToDelete);
        throw new Error("No se pudo identificar el edge para eliminar");
      }

      const requestBody = {
        ...(edgeToDelete.id && { id: edgeToDelete.id }),
        ...(edgeToDelete.name && { name: edgeToDelete.name }),
      };

      console.log("Deleting edge with:", requestBody);

      const res = await fetch("/api/edges", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const responseData = await res.json();

      if (!res.ok) {
        console.error("Server error:", responseData);
        throw new Error(responseData.details || "Error al eliminar edge");
      }

      console.log("Edge deleted successfully:", responseData);
      setCustomEdges((prev) => prev.filter((edge) => edge.name !== edgeName));
    } catch (err) {
      console.error("Error al eliminar edge:", err);
      alert(`No se pudo eliminar el edge: ${err.message}`);
    }
  };

  const handleDeleteCustomPrompt = async (promptName) => {
    try {
      const promptToDelete = customPrompts.find(
        (prompt) => prompt.name === promptName
      );

      const requestBody = promptToDelete?.id
        ? { id: promptToDelete.id, name: promptName }
        : { name: promptName };

      const res = await fetch("/api/prompts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || "Error al eliminar prompt");
      }

      await res.json();
      setCustomPrompts((prev) =>
        prev.filter((prompt) => prompt.name !== promptName)
      );
    } catch (err) {
      console.error("Error al eliminar prompt:", err);
      alert(`No se pudo eliminar el prompt: ${err.message}`);
    }
  };

  const handleDeleteCustomChain = async (chainName) => {
    try {
      const chainToDelete = customChains.find(
        (chain) => chain.name === chainName
      );

      const requestBody = chainToDelete?.id
        ? { id: chainToDelete.id, name: chainName }
        : { name: chainName };

      const res = await fetch("/api/chains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || "Error al eliminar chain");
      }

      await res.json();
      setCustomChains((prev) =>
        prev.filter((chain) => chain.name !== chainName)
      );
    } catch (err) {
      console.error("Error al eliminar chain:", err);
      alert(`No se pudo eliminar la chain: ${err.message}`);
    }
  };

  const handleDeleteCustomTool = async (toolName) => {
    try {
      const toolToDelete = customTools.find((tool) => tool.name === toolName);

      const requestBody = toolToDelete?.id
        ? { id: toolToDelete.id, name: toolName }
        : { name: toolName };

      const res = await fetch("/api/tools", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || "Error al eliminar tool");
      }

      await res.json();
      setCustomTools((prev) => prev.filter((tool) => tool.name !== toolName));
    } catch (err) {
      console.error("Error al eliminar tool:", err);
      alert(`No se pudo eliminar la tool: ${err.message}`);
    }
  };

  const handleAddClick = (event) => {
    setAnchorElAdd(event.currentTarget);
  };

  const handleAddClose = () => {
    setAnchorElAdd(null);
  };

  const handleAddOption = (mode) => {
    popupAction(mode);
    handleAddClose();
  };

  const activeModalConfig = modalConfigs[popupMode] ?? modalConfigs.node;
  const modalTitle = isEditing
    ? activeModalConfig.editTitle ?? activeModalConfig.title
    : activeModalConfig.title;
  const modalSaveLabel = isEditing ? "Guardar cambios" : "Guardar";
  const modalLanguage =
    isEditing && editingContext?.item?.language
      ? editingContext.item.language
      : activeModalConfig.language;
  const modalEditorType = activeModalConfig.editorType;
  const modalContentLabel = activeModalConfig.contentLabel;
  const modalTextPlaceholder = activeModalConfig.textPlaceholder;

  const handleLoadDiagram = (diagram) => {
    try {
      console.log("Loading diagram:", diagram); // Para depuración
      const diagramContent = diagram.content || diagram.graph; // Soporta ambos nombres por compatibilidad

      if (!diagramContent) {
        throw new Error("El diagrama no tiene contenido válido");
      }

      if (onLoadDiagram) {
        onLoadDiagram({ graph: diagramContent, name: diagram.name });
      } else {
        window.dispatchEvent(
          new CustomEvent("load-diagram", {
            detail: { graph: diagramContent, name: diagram.name },
          })
        );
      }
      // selectPanelTab("diagrams"); // Removed tab switching
    } catch (err) {
      console.error("Error al cargar el diagrama:", err);
    }
  };

  function TransitionComponent(props) {
    const style = useSpring({
      to: {
        opacity: props.in ? 1 : 0,
        transform: `translate3d(${props.in ? 0 : 20}px,0,0)`,
      },
    });

    return (
      <animated.div style={style}>
        <Collapse
          {...props}
          sx={{
            color: "white",
          }}
        />
      </animated.div>
    );
  }

  const CustomTreeItem = React.forwardRef((props, ref) => {
    const { children, ...other } = props;
    return (
      <TreeItem
        {...other}
        slots={{ groupTransition: TransitionComponent, ...other.slots }}
        slotProps={{
          content: {
            sx: {
              borderRadius: "10px",
              color: "white",
              display: "flex",
              flexDirection: "row-reverse", 
              alignItems: "center",
              height: "40px",

              "&:hover": {
                backgroundColor: "rgba(109, 116, 156, 0.48)",
              },
            },
          },
          iconContainer: {
            sx: {
              color: "white",
              display: children ? "flex" : "none",
            },
          },
          label: {
            sx: {
              color: "white",
              flexGrow: 1,
              width: "100%",
              minWidth: 0,
              display: "flex",
              alignItems: "center",
            },
          },
          groupTransition: {
            sx: {
              ml: "15.5px",
              borderLeft: "2px dashed rgba(255, 255, 255, 1)",
            },
          },
        }}
        ref={ref}
      >
        {children}
      </TreeItem>
    );
  });

  const renderSidebarContent = () => {
    const commonTreeItemLabel = (
      label,
      icon,
      menu,
      draggableProps = {},
      onAdd = null
    ) => (
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          color: "white",
          cursor: "pointer",
          gap: "8px",
          justifyContent: "space-between",
        }}
        {...draggableProps}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {icon && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "18px",
                height: "18px",
              }}
            >
              {icon}
            </span>
          )}

          <span>{label}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
          {onAdd && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAdd();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.1)",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: "10px",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)")
              }
            >
              <FaPlus />
            </button>
          )}
          {menu}
        </div>
      </div>
    );

    const conditionalEdges = customEdges.filter((edge) => edge.conditionalEdge);
    const standardEdges = customEdges.filter((edge) => !edge.conditionalEdge);

    const sidebarIcons = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          marginTop: "45px",
          color: "white",
          fontSize: "1.2rem",
        }}
      >
        <span
          title="Diagrams"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <MdOutlineSchema />
        </span>
        <span
          title="Nodes"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <FaCircle />
        </span>
        <span
          title="Edges"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <FaFilter />
        </span>
        <span
          title="Conditional Edges"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <IfIcon />
        </span>
        <span
          title="Prompts"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <TbPrompt />
        </span>
        <span
          title="Tools"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <FiTool />
        </span>
        <span
          title="Chains"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <HiLink />
        </span>
      </div>
    );

    return (
      <aside
        className="chatgpt-sidebar"
        style={{
          width: isCollapsed ? "50px" : "300px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "#1b1b1b",
          borderRight: "1px solid #333",
          transition: "width 0.3s ease",
          position: "relative",
        }}
      >
        {/* Collapsed View Container */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "50px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: "10px",
            gap: "20px",
            opacity: isCollapsed ? 1 : 0,
            pointerEvents: isCollapsed ? "auto" : "none",
            transition: "opacity 0.2s ease",
            zIndex: 10,
          }}
        >
          <button
            onClick={() => setIsCollapsed(false)}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "1.2rem",
              padding: "8px",
            }}
          >
            <AiOutlineMenu />
          </button>
          {sidebarIcons}
        </div>

        {/* Expanded View Container */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "300px", // Fixed width to prevent squishing
            height: "100%",
            display: "flex",
            flexDirection: "column",
            opacity: isCollapsed ? 0 : 1,
            pointerEvents: isCollapsed ? "none" : "auto",
            transition: "opacity 0.2s ease",
            zIndex: 5,
          }}
        >
          {/* Sidebar Header */}
          <div
            style={{
              height: "60px",
              background: "#1b1b1b",
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              gap: "12px",
              borderBottom: "1px solid #333",
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => router.push("/store")}
              style={{
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.9rem",
                fontWeight: 600,
              }}
            >
              <FaStore /> Store
            </button>
            <button
              onClick={() => selectPanelTab("settings")}
              style={{
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.9rem",
                fontWeight: 600,
              }}
            >
              <AiOutlineSetting /> Settings
            </button>
          </div>

          {/* Toggle Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "5px 10px",
              background: "#1b1b1b",
            }}
          >
            <button
              onClick={() => setIsCollapsed(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: "1.2rem",
              }}
            >
              <AiOutlineMenu />
            </button>
          </div>

          {/* Tree View */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              padding: "10px",
              background: "#1b1b1b",
              scrollbarGutter: "stable",
              "&::-webkit-scrollbar": {
                width: "12px",
              },
              "&::-webkit-scrollbar-track": {
                background: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                borderRadius: "15px",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.4)",
              },
            }}
          >
            <SimpleTreeView>
              {/* Diagrams Section */}
              <CustomTreeItem
                itemId="section-diagrams"
                label={commonTreeItemLabel(
                  "Diagrams",
                  <MdOutlineSchema />,
                  null,
                  {},
                  () => handleAddOption("diagram")
                )}
              >
                {customDiagrams.length > 0 &&
                  customDiagrams.map((d) => (
                    <CustomTreeItem
                      key={d.name}
                      itemId={`diagram-${d.name}`}
                      label={commonTreeItemLabel(
                        d.name,
                        null,
                        <LongMenu
                          onOpenChange={(open) =>
                            setMenuOpenId(open ? "node-Base" : null)
                          }
                          onEdit={() => handleEditCustomDiagram(d)}
                          onDelete={() => handleDeleteCustomDiagram(d.name)}
                          isPublic={Boolean(d.isPublic)}
                          onToggleVisibility={(nextValue) =>
                            handleToggleDiagramVisibility(d, nextValue)
                          }
                        />,
                        {
                          onClick: () => handleLoadDiagram(d),
                          style: {
                            cursor: "pointer",
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            color: "white",
                          },
                        }
                      )}
                    />
                  ))}
              </CustomTreeItem>

              {/* Nodes Section */}
              <CustomTreeItem
                itemId="section-nodes"
                label={commonTreeItemLabel(
                  "Nodes",
                  <FaCircle />,
                  null,
                  {},
                  () => handleAddOption("node")
                )}
              >
                {customNodes.length > 0 &&
                  customNodes.map((n) => (
                    <CustomTreeItem
                      key={n.name}
                      itemId={`node-${n.name}`}
                      label={commonTreeItemLabel(
                        n.name,
                        null,
                        <LongMenu
                          onOpenChange={(open) =>
                            setMenuOpenId(open ? `custom-${n.name}` : null)
                          }
                          onEdit={() => handleEditCustomNode(n)}
                          onDelete={() => handleDeleteCustomNode(n.name)}
                          isPublic={Boolean(n.isPublic)}
                          onToggleVisibility={(nextValue) =>
                            handleToggleNodeVisibility(n, nextValue)
                          }
                        />,
                        {
                          draggable: true,
                          onDragStart: (event) =>
                            onDragStart(event, n.name, n.code),
                          onDragEnd: handleDragEnd,
                        }
                      )}
                    />
                  ))}
              </CustomTreeItem>

              {/* Edges Section */}
              <CustomTreeItem
                itemId="section-edges"
                label={commonTreeItemLabel(
                  "Edges",
                  <FaFilter />,
                  null,
                  {},
                  () => handleAddOption("edge")
                )}
              >
                {standardEdges.length > 0 &&
                  standardEdges.map((item) => (
                    <CustomTreeItem
                      key={item.id}
                      itemId={`edge-custom-${item.id}`}
                      label={commonTreeItemLabel(
                        item.name,
                        null,
                        <LongMenu
                          onOpenChange={(open) =>
                            setMenuOpenId(open ? `custom-${item.id}` : null)
                          }
                          onEdit={() => handleEditCustomEdge(item)}
                          onDelete={() => handleDeleteCustomEdge(item.name)}
                          isPublic={Boolean(item.isPublic)}
                          onToggleVisibility={(nextValue) =>
                            handleToggleEdgeVisibility(item, nextValue)
                          }
                        />,
                        {
                          draggable: true,
                          onDragStart: (event) =>
                            onEdgeDragStart(
                              event,
                              item.name,
                              item.code,
                              "filterEdge",
                              item.id
                            ),
                          onDragEnd: handleDragEnd,
                          style: {
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            color: "white",
                          },
                        }
                      )}
                    />
                  ))}
              </CustomTreeItem>

              {/* Conditional Edges Section */}
              <CustomTreeItem
                itemId="section-conditional-edges"
                label={commonTreeItemLabel(
                  "Filtros Condicional",
                  <IfIcon />,
                  null,
                  {},
                  () => handleAddOption("edge")
                )}
              >
                {conditionalEdges.map((itemE) => (
                  <CustomTreeItem
                    key={itemE.id}
                    itemId={`edge-conditional-${itemE.id}`}
                    label={commonTreeItemLabel(
                      itemE.name,
                      null,
                      <LongMenu
                        onOpenChange={(open) =>
                          setMenuOpenId(open ? `conditional-${itemE.id}` : null)
                        }
                        onEdit={() => handleEditCustomEdge(itemE)}
                        onDelete={() => handleDeleteCustomEdge(itemE.name)}
                        isPublic={Boolean(itemE.isPublic)}
                        onToggleVisibility={(nextValue) =>
                          handleToggleEdgeVisibility(itemE, nextValue)
                        }
                      />,
                      {
                        draggable: true,
                        onDragStart: (event) =>
                          onDragStart(
                            event,
                            "conditionalNode",
                            itemE.code,
                            itemE.name
                          ),
                        onDragEnd: handleDragEnd,
                        style: {
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          color: "white",
                        },
                      }
                    )}
                  />
                ))}
              </CustomTreeItem>

              {/* Prompts Section */}
              <CustomTreeItem
                itemId="section-prompts"
                label={commonTreeItemLabel(
                  "Prompts",
                  <TbPrompt />,
                  null,
                  {},
                  () => handleAddOption("prompt")
                )}
              >
                {customPrompts.length > 0 &&
                  customPrompts.map((p) => (
                    <CustomTreeItem
                      key={p.name}
                      itemId={`prompt-${p.name}`}
                      label={commonTreeItemLabel(
                        p.name,
                        null,
                        <LongMenu
                          className="kebab-menu"
                          onOpenChange={(open) =>
                            setMenuOpenId(open ? `prompt-${p.name}` : null)
                          }
                          onEdit={() => handleEditCustomPrompt(p)}
                          onDelete={() => handleDeleteCustomPrompt(p.name)}
                          isPublic={Boolean(p.isPublic)}
                          onToggleVisibility={(nextValue) =>
                            handleTogglePromptVisibility(p, nextValue)
                          }
                        />,
                        {
                          draggable: true,
                          onDragStart: (event) => onPromptDragStart(event, p),
                          onDragEnd: handleDragEnd,
                        }
                      )}
                    />
                  ))}
              </CustomTreeItem>

              {/* Tools Section */}
              <CustomTreeItem
                itemId="section-tools"
                label={commonTreeItemLabel(
                  "Tools",
                  <FiTool />,
                  null,
                  {},
                  () => handleAddOption("tool")
                )}
              >
                {customTools.length > 0 &&
                  customTools.map((t) => (
                    <CustomTreeItem
                      key={t.name}
                      itemId={`tool-${t.name}`}
                      label={commonTreeItemLabel(
                        t.name,
                        null,
                        <LongMenu
                          className="kebab-menu"
                          onOpenChange={(open) =>
                            setMenuOpenId(open ? `tool-${t.name}` : null)
                          }
                          onEdit={() => handleEditCustomTool(t)}
                          onDelete={() => handleDeleteCustomTool(t.name)}
                          isPublic={Boolean(t.isPublic)}
                          onToggleVisibility={(nextValue) =>
                            handleToggleToolVisibility(t, nextValue)
                          }
                        />,
                        {
                          draggable: true,
                          onDragStart: (event) => onToolDragStart(event, t),
                          onDragEnd: handleDragEnd,
                        }
                      )}
                    />
                  ))}
              </CustomTreeItem>

              {/* Chains Section */}
              <CustomTreeItem
                itemId="section-chains"
                label={commonTreeItemLabel(
                  "Chains",
                  <HiLink />,
                  null,
                  {},
                  () => handleAddOption("chain")
                )}
              >
                {customChains.length > 0 &&
                  customChains.map((c) => (
                    <CustomTreeItem
                      key={c.name}
                      itemId={`chain-${c.name}`}
                      label={commonTreeItemLabel(
                        c.name,
                        null,
                        <LongMenu
                          className="kebab-menu"
                          onOpenChange={(open) =>
                            setMenuOpenId(open ? `chain-${c.name}` : null)
                          }
                          onEdit={() => handleEditCustomChain(c)}
                          onDelete={() => handleDeleteCustomChain(c.name)}
                          isPublic={Boolean(c.isPublic)}
                          onToggleVisibility={(nextValue) =>
                            handleToggleChainVisibility(c, nextValue)
                          }
                        />,
                        {
                          draggable: true,
                          onDragStart: (event) => onChainDragStart(event, c),
                          onDragEnd: handleDragEnd,
                        }
                      )}
                    />
                  ))}
              </CustomTreeItem>
            </SimpleTreeView>
          </Box>

          {/* Footer with Add Button */}
          <div
            style={{
              height: "60px",
              background: "#1b1b1b",
              borderTop: "1px solid #333",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <button
              onClick={handleAddClick}
              style={{
                background: "#2196f3",
                border: "none",
                borderRadius: "4px",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                fontSize: "0.9rem",
                fontWeight: 600,
                width: "90%",
                justifyContent: "center",
              }}
            >
              <FaPlus /> Add
            </button>
            <Menu
              anchorEl={anchorElAdd}
              open={openAddMenu}
              onClose={handleAddClose}
              anchorOrigin={{
                vertical: "top",
                horizontal: "center",
              }}
              transformOrigin={{
                vertical: "bottom",
                horizontal: "center",
              }}
            >
              <MenuItem onClick={() => handleAddOption("node")}>
                Custom Node
              </MenuItem>
              <MenuItem onClick={() => handleAddOption("edge")}>
                Custom Edge
              </MenuItem>
              <MenuItem onClick={() => handleAddOption("prompt")}>
                Custom Prompt
              </MenuItem>
              <MenuItem onClick={() => handleAddOption("tool")}>
                Custom Tool
              </MenuItem>
              <MenuItem onClick={() => handleAddOption("chain")}>
                Custom Chain
              </MenuItem>
            </Menu>
          </div>
        </div>
      </aside>
    );
  };

  return (
    <>
      {renderSidebarContent()}

      <CustomModal
        key={`${popupMode}-${editingContext?.item?.id ?? "new"}`}
        isVisible={isPopupVisible}
        onClose={handleModalClose}
        onSave={handleSaveFromPopup}
        initialCode={modalInitialCode}
        initialName={modalInitialName}
        initialConditionalEdge={modalInitialConditionalEdge}
        showConditionalEdge={popupMode === "edge"}
        title={modalTitle}
        nameLabel={activeModalConfig.nameLabel}
        namePlaceholder={activeModalConfig.namePlaceholder}
        language={modalLanguage}
        editorType={modalEditorType}
        contentLabel={modalContentLabel}
        textPlaceholder={modalTextPlaceholder}
        saveLabel={modalSaveLabel}
      />
    </>
  );
};

export default Sidebar;
