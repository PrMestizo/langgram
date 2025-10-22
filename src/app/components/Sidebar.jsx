// Sidebar.jsx
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDnD } from "./DnDContext";
import LongMenu from "./KebabMenu";
import CustomModal from "./Modal";
import { BsDiagram3 } from "react-icons/bs";
import { FaShareNodes } from "react-icons/fa6";
import { MdCable } from "react-icons/md";
import { FaApple } from "react-icons/fa";
import { FaAnkh } from "react-icons/fa";
import { TbPrompt } from "react-icons/tb";
import { GiCrossedChains } from "react-icons/gi";
import { AiOutlineSetting } from "react-icons/ai";
import { FaStore } from "react-icons/fa";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const Sidebar = ({ onLoadDiagram }) => {
  const { setType, setCode, setDragPayload } = useDnD();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupMode, setPopupMode] = useState("node");
  const [featuredDiagrams, setFeaturedDiagrams] = useState([]);
  const [featuredNodes, setFeaturedNodes] = useState([]);
  const [featuredEdges, setFeaturedEdges] = useState([]);
  const [featuredPrompts, setFeaturedPrompts] = useState([]);
  const [featuredChains, setFeaturedChains] = useState([]);
  const [customDiagrams, setCustomDiagrams] = useState([]);
  const [customNodes, setCustomNodes] = useState([]);
  const [customEdges, setCustomEdges] = useState([]);
  const [customPrompts, setCustomPrompts] = useState([]);
  const [customChains, setCustomChains] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [modalInitialName, setModalInitialName] = useState("");
  const [modalInitialCode, setModalInitialCode] = useState("");
  const [editingContext, setEditingContext] = useState(null);
  const tabItems = useMemo(
    () => [
      {
        id: "diagrams",
        label: "Diagrams",
        icon: <BsDiagram3 />,
        type: "panel",
      },
      { id: "nodes", label: "Nodes", icon: <FaShareNodes />, type: "panel" },
      { id: "edges", label: "Edges", icon: <MdCable />, type: "panel" },
      { id: "prompts", label: "Prompts", icon: <TbPrompt />, type: "panel" },
      {
        id: "chains",
        label: "Chains",
        icon: <GiCrossedChains />,
        type: "panel",
      },
      {
        id: "store",
        label: "Store",
        icon: <FaStore />,
        type: "route",
        path: "/store",
      },
      {
        id: "settings",
        label: "Settings",
        icon: <AiOutlineSetting />,
        type: "panel",
      },
    ],
    []
  );
  const defaultPanelId = tabItems[0].id;
  const [activeTab, setActiveTab] = useState(defaultPanelId);
  const router = useRouter();
  const pathname = usePathname();

  const activeTabConfig = tabItems.find((item) => item.id === activeTab);
  const isPanelVisible = activeTabConfig?.type === "panel";

  const isEditing = Boolean(editingContext);

  useEffect(() => {
    const fetchFeatured = async (endpoint, setter) => {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        setter(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(`Error al cargar destacados (${endpoint}):`, err);
        setter([]);
      }
    };

    fetchFeatured("/api/diagrams?surface=sidebar", setFeaturedDiagrams);
    fetchFeatured("/api/nodes?surface=sidebar", setFeaturedNodes);
    fetchFeatured("/api/edges?surface=sidebar", setFeaturedEdges);
    fetchFeatured("/api/prompts?surface=sidebar", setFeaturedPrompts);
    fetchFeatured("/api/chains?surface=sidebar", setFeaturedChains);
  }, []);

  useEffect(() => {
    if (pathname === "/store") {
      setActiveTab("store");
      setMenuOpenId(null);
      return;
    }

    if (activeTab === "store" && pathname !== "/store") {
      setActiveTab(defaultPanelId);
    }
  }, [activeTab, defaultPanelId, pathname]);

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
      editorType: "text",
      contentLabel: "Contenido del prompt",
      textPlaceholder: "Escribe aquí el prompt...",
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
      const res = await fetch("/api/diagrams");
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
        const res = await fetch("/api/nodes");
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
        const res = await fetch("/api/edges");
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
        const res = await fetch("/api/prompts");
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
        const res = await fetch("/api/chains");
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

  const onDragStart = (event, nodeType, nodeCode) => {
    const payload = {
      kind: "node",
      type: nodeType,
      code: nodeCode || "",
      name: nodeType,
    };
    setType(nodeType);
    setCode(nodeCode);
    setDragPayload(payload);
    event.dataTransfer.setData("application/node-type", nodeType);
    event.dataTransfer.setData("application/node-code", nodeCode ?? "");
    event.dataTransfer.effectAllowed = "move";
  };

  const onEdgeDragStart = (event, edgeName, edgeCode) => {
    setType(null);
    setCode(null);
    const payload = {
      kind: "edge",
      type: "filterEdge",
      code: edgeCode || "",
      name: edgeName,
    };
    setDragPayload(payload);
    event.dataTransfer.setData("application/edge-name", edgeName ?? "");
    event.dataTransfer.setData("application/edge-code", edgeCode ?? "");
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

  const handleDragEnd = () => {
    setType(null);
    setCode(null);
    setDragPayload(null);
  };

  const handleNavClick = (item, event) => {
    event.preventDefault();

    if (item.type === "route" && item.path) {
      if (pathname !== item.path) {
        router.push(item.path);
      }
      setActiveTab(item.id);
      setMenuOpenId(null);
      return;
    }

    if (pathname === "/store" && item.id !== "store") {
      router.push("/");
    }

    if (activeTab === item.id) {
      setActiveTab(null);
      setMenuOpenId(null);
    } else {
      setActiveTab(item.id);
    }
  };

  const popupAction = (mode = "node") => {
    setMenuOpenId(null);
    setEditingContext(null);
    setPopupMode(mode);
    setModalInitialName("");
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
    setIsPopupVisible(true);
  };

  const handleModalClose = () => {
    setIsPopupVisible(false);
    setEditingContext(null);
    setModalInitialName("");
    setModalInitialCode("");
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

  const handleSaveCustomEdge = async (code, edgeName) => {
    const newEdge = { name: edgeName, code, language: "python" };
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
      return true;
    } catch (err) {
      console.error("Error al actualizar nodo:", err);
      alert(`No se pudo actualizar el nodo: ${err.message}`);
      return false;
    }
  };

  const handleUpdateCustomEdge = async (edge, code, edgeName) => {
    try {
      const payload = {
        id: edge.id,
        name: edgeName,
        code,
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
      return true;
    } catch (err) {
      console.error("Error al actualizar chain:", err);
      alert(`No se pudo actualizar la chain: ${err.message}`);
      return false;
    }
  };

  // Unified save handler so we can also switch to the right tab after save
  const handleSaveFromPopup = (code, name) => {
    if (editingContext) {
      const { type, item } = editingContext;
      if (type === "diagram") {
        return handleUpdateCustomDiagram(item, code, name);
      } else if (type === "edge") {
        return handleUpdateCustomEdge(item, code, name);
      } else if (type === "prompt") {
        return handleUpdateCustomPrompt(item, code, name);
      } else if (type === "chain") {
        return handleUpdateCustomChain(item, code, name);
      } else {
        return handleUpdateCustomNode(item, code, name);
      }
    }

    if (popupMode === "edge") {
      handleSaveCustomEdge(code, name);
      setActiveTab("edges"); // switch to Edges tab
    } else if (popupMode === "prompt") {
      handleSaveCustomPrompt(code, name);
      setActiveTab("prompts"); // switch to Prompts tab
    } else if (popupMode === "chain") {
      handleSaveCustomChain(code, name);
      setActiveTab("chains"); // switch to Chains tab
    } else {
      handleSaveCustomNode(code, name);
      setActiveTab("nodes"); // switch to Nodes tab
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

      // Preparar el body con id si está disponible, si no usar name
      const requestBody = edgeToDelete?.id
        ? { id: edgeToDelete.id, name: edgeName } // Enviar ambos por si acaso
        : { name: edgeName };

      const res = await fetch("/api/edges", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("Server error:", error);
        throw new Error(error.details || "Error al eliminar edge");
      }

      const deleted = await res.json();
      console.log("Edge deleted successfully:", deleted);

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
        onLoadDiagram(diagramContent);
      } else {
        window.dispatchEvent(
          new CustomEvent("load-diagram", { detail: diagramContent })
        );
      }
      setActiveTab("diagrams");
    } catch (err) {
      console.error("Error al cargar el diagrama:", err);
    }
  };

  const renderTabContent = () => {
    if (activeTab === null) {
      return null;
    }
    switch (activeTab) {
      case "diagrams":
        return (
          <div className="tab-content">
            <div className="node-section">
              <div className="section-title">Diagram Tools</div>
              <div
                className={`node-item ${
                  menuOpenId === "create-flow" ? "active" : ""
                }`}
              >
                <div className="node-icon">
                  <FaAnkh />
                </div>
                Create Flow
                <LongMenu
                  className="kebab-menu"
                  onOpenChange={(open) =>
                    setMenuOpenId(open ? "create-flow" : null)
                  }
                />
              </div>
              <div className="node-item">
                <div className="node-icon">
                  <FaAnkh />
                </div>
                Save Diagram
                <LongMenu
                  className="kebab-menu"
                  onOpenChange={(open) =>
                    setMenuOpenId(open ? "node-Base" : null)
                  }
                />
              </div>
            </div>
            {featuredDiagrams.length > 0 && (
              <div className="node-section">
                <div className="section-title">Featured Diagrams</div>
                {featuredDiagrams.map((d) => (
                  <div
                    key={d.id}
                    className="node-item"
                    onClick={() => handleLoadDiagram(d)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="node-icon">
                      <FaAnkh />
                    </div>
                    {d.name}
                  </div>
                ))}
              </div>
            )}
            {customDiagrams.length > 0 && (
              <div className="node-section">
                <div className="section-title">Saved Diagrams</div>
                {customDiagrams.map((d) => (
                  <div
                    key={d.name}
                    className="node-item"
                    onClick={() => handleLoadDiagram(d)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="node-icon">
                      <FaAnkh />
                    </div>
                    {d.name}
                    <LongMenu
                      className="kebab-menu"
                      onOpenChange={(open) =>
                        setMenuOpenId(open ? "node-Base" : null)
                      }
                      onEdit={() => handleEditCustomDiagram(d)}
                      onDelete={() => handleDeleteCustomDiagram(d.name)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case "nodes":
        return (
          <div className="tab-content">
            <div className="node-section">
              <div className="section-title">Essential Nodes</div>
              <div
                className={`node-item ${
                  menuOpenId === "node-Base" ? "active" : ""
                }`}
                onDragStart={(event) =>
                  onDragStart(event, "Start", "Codigo provisional")
                }
                onDragEnd={handleDragEnd}
                draggable
              >
                <div className="node-icon">
                  <FaApple />
                </div>
                START
                <LongMenu
                  className="kebab-menu"
                  onOpenChange={(open) =>
                    setMenuOpenId(open ? "node-Base" : null)
                  }
                />
              </div>
              <div
                className={`node-item ${
                  menuOpenId === "node-Input" ? "active" : ""
                }`}
                onDragStart={(event) =>
                  onDragStart(event, "END", "Codigo provisional")
                }
                onDragEnd={handleDragEnd}
                draggable
              >
                <div className="node-icon">
                  <FaApple />
                </div>
                END
                <LongMenu
                  className="kebab-menu"
                  onOpenChange={(open) =>
                    setMenuOpenId(open ? "node-Input" : null)
                  }
                />
              </div>
            </div>
            {featuredNodes.length > 0 && (
              <div className="node-section">
                <div className="section-title">Featured Nodes</div>
                {featuredNodes.map((n) => (
                  <div
                    key={n.id}
                    className="node-item"
                    onDragStart={(event) =>
                      onDragStart(event, n.name, n.code)
                    }
                    onDragEnd={handleDragEnd}
                    draggable
                  >
                    <div className="node-icon">
                      <FaApple />
                    </div>
                    {n.name}
                  </div>
                ))}
              </div>
            )}
            {customNodes.length > 0 && (
              <div className="node-section">
                <div className="section-title">Custom Nodes</div>
                {customNodes.map((n) => (
                  <div
                    key={n.name}
                    className={`node-item ${
                      menuOpenId === `custom-${n.name}` ? "active" : ""
                    }`}
                    onDragStart={(event) => onDragStart(event, n.name, n.code)}
                    onDragEnd={handleDragEnd}
                    draggable
                  >
                    <div className="node-icon">
                      <FaApple />
                    </div>
                    {n.name}
                    <LongMenu
                      className="kebab-menu"
                      onOpenChange={(open) =>
                        setMenuOpenId(open ? `custom-${n.name}` : null)
                      }
                      onEdit={() => handleEditCustomNode(n)}
                      onDelete={() => handleDeleteCustomNode(n.name)}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="sidebar-action-buttons">
              <button
                className="sidebar-action-btn primary"
                onClick={() => popupAction("node")}
              >
                <span className="btn-icon">➕</span>
                Add Custom Node
              </button>
            </div>
          </div>
        );
      case "edges":
        return (
          <div className="tab-content">
            <div className="node-section">
              <div className="section-title">Connection Types</div>
              <div
                className={`node-item edge-item ${
                  menuOpenId === "node-Input" ? "active" : ""
                }`}
                onDragStart={(event) =>
                  onEdgeDragStart(event, "Direct Connection")
                }
                onDragEnd={handleDragEnd}
                draggable
              >
                <div className="edge-item__circle">→</div>
                Direct Connection
                <LongMenu
                  className="kebab-menu"
                  onOpenChange={(open) =>
                    setMenuOpenId(open ? "node-Base" : null)
                  }
                />
              </div>
              <div
                className="node-item edge-item"
                onDragStart={(event) =>
                  onEdgeDragStart(event, "Conditional Flow")
                }
                onDragEnd={handleDragEnd}
                draggable
              >
                <div className="edge-item__circle">⤴</div>
                Conditional Flow
                <LongMenu
                  className="kebab-menu"
                  onOpenChange={(open) =>
                    setMenuOpenId(open ? "node-Base" : null)
                  }
                />
              </div>
            </div>
            {featuredEdges.length > 0 && (
              <div className="node-section">
                <div className="section-title">Featured Edges</div>
                {featuredEdges.map((item) => (
                  <div
                    key={item.id}
                    className="node-item edge-item edge-item--custom"
                    onDragStart={(event) =>
                      onEdgeDragStart(event, item.name, item.code)
                    }
                    onDragEnd={handleDragEnd}
                    draggable
                  >
                    <div className="edge-item__circle">ƒ</div>
                    {item.name}
                  </div>
                ))}
              </div>
            )}
            {customEdges.length > 0 && (
              <div className="node-section">
                <div className="section-title">Custom Edges</div>
                {customEdges.map((item) => (
                  <div
                    key={item.name}
                    className={`node-item edge-item edge-item--custom ${
                      menuOpenId === `custom-${item.name}` ? "active" : ""
                    }`}
                    onDragStart={(event) =>
                      onEdgeDragStart(event, item.name, item.code)
                    }
                    onDragEnd={handleDragEnd}
                    draggable
                  >
                    <div className="edge-item__circle">ƒ</div>
                    {item.name}
                    <LongMenu
                      className="kebab-menu"
                      onOpenChange={(open) =>
                        setMenuOpenId(open ? `custom-${item.name}` : null)
                      }
                      onEdit={() => handleEditCustomEdge(item)}
                      onDelete={() => handleDeleteCustomEdge(item.name)}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="sidebar-action-buttons">
              <button
                className="sidebar-action-btn primary"
                onClick={() => popupAction("edge")}
              >
                <span className="btn-icon">➕</span>
                Add Custom Edge
              </button>
            </div>
          </div>
        );
      case "prompts":
        return (
          <div className="tab-content">
            {featuredPrompts.length > 0 && (
              <div className="node-section">
                <div className="section-title">Featured Prompts</div>
                {featuredPrompts.map((p) => (
                  <div
                    key={p.id}
                    className="node-item"
                    draggable
                    onDragStart={(event) => onPromptDragStart(event, p)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="node-icon">
                      <TbPrompt />
                    </div>
                    {p.name}
                  </div>
                ))}
              </div>
            )}
            {customPrompts.length > 0 && (
              <div className="node-section">
                <div className="section-title">Custom Prompts</div>
                {customPrompts.map((p) => (
                  <div
                    key={p.name}
                    className={`node-item ${
                      menuOpenId === `prompt-${p.name}` ? "active" : ""
                    }`}
                    draggable
                    onDragStart={(event) => onPromptDragStart(event, p)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="node-icon">
                      <TbPrompt />
                    </div>
                    {p.name}
                    <LongMenu
                      className="kebab-menu"
                      onOpenChange={(open) =>
                        setMenuOpenId(open ? `prompt-${p.name}` : null)
                      }
                      onEdit={() => handleEditCustomPrompt(p)}
                      onDelete={() => handleDeleteCustomPrompt(p.name)}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="sidebar-action-buttons">
              <button
                className="sidebar-action-btn primary"
                onClick={() => popupAction("prompt")}
              >
                <span className="btn-icon">➕</span>
                Add Custom Prompt
              </button>
            </div>
          </div>
        );
      case "chains":
        return (
          <div className="tab-content">
            {featuredChains.length > 0 && (
              <div className="node-section">
                <div className="section-title">Featured Chains</div>
                {featuredChains.map((c) => (
                  <div
                    key={c.id}
                    className="node-item"
                    draggable
                    onDragStart={(event) => onChainDragStart(event, c)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="node-icon">
                      <GiCrossedChains />
                    </div>
                    {c.name}
                  </div>
                ))}
              </div>
            )}
            {customChains.length > 0 && (
              <div className="node-section">
                <div className="section-title">Custom Chains</div>
                {customChains.map((c) => (
                  <div
                    key={c.name}
                    className={`node-item ${
                      menuOpenId === `chain-${c.name}` ? "active" : ""
                    }`}
                    draggable
                    onDragStart={(event) => onChainDragStart(event, c)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="node-icon">
                      <GiCrossedChains />
                    </div>
                    {c.name}
                    <LongMenu
                      className="kebab-menu"
                      onOpenChange={(open) =>
                        setMenuOpenId(open ? `chain-${c.name}` : null)
                      }
                      onEdit={() => handleEditCustomChain(c)}
                      onDelete={() => handleDeleteCustomChain(c.name)}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="sidebar-action-buttons">
              <button
                className="sidebar-action-btn primary"
                onClick={() => popupAction("chain")}
              >
                <span className="btn-icon">➕</span>
                Add Custom Chain
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <aside
        className={`chatgpt-sidebar ${!isPanelVisible ? "collapsed" : ""}`}
      >
        <div className="vs-sidebar">
          <nav className="vs-sidebar-nav" aria-label="Sidebar tabs">
            {tabItems.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.label}
                className={`vs-nav-item ${
                  activeTab === item.id ? "active" : ""
                }`}
                onClick={(event) => handleNavClick(item, event)}
              >
                <span className="vs-nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="sr-only">{item.label}</span>
              </button>
            ))}
          </nav>
          {isPanelVisible && activeTabConfig && (
            <div className="vs-sidebar-panel">
              <div className="vs-panel-header">
                <span className="vs-panel-icon" aria-hidden="true">
                  {activeTabConfig.icon}
                </span>
                <span className="vs-panel-title">{activeTabConfig.label}</span>
              </div>
              <div className="sidebar-content">{renderTabContent()}</div>
            </div>
          )}
        </div>
      </aside>

      <CustomModal
        key={`${popupMode}-${editingContext?.item?.id ?? "new"}`}
        isVisible={isPopupVisible}
        onClose={handleModalClose}
        onSave={handleSaveFromPopup}
        initialCode={modalInitialCode}
        initialName={modalInitialName}
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
