// Sidebar.jsx
"use client";
import { useEffect, useState } from "react";
import { useDnD } from "./DnDContext";
import LongMenu from "./KebabMenu";
import CustomModal from "./Modal";
import { BsDiagram3 } from "react-icons/bs";
import { FaShareNodes } from "react-icons/fa6";
import { MdCable } from "react-icons/md";
import { FaApple } from "react-icons/fa";
import { FaAnkh } from "react-icons/fa";

const Sidebar = ({ onLoadDiagram }) => {
  const { setType, setCode, setDragPayload } = useDnD();
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupMode, setPopupMode] = useState("node");
  const [customDiagrams, setCustomDiagrams] = useState([]);
  const [customNodes, setCustomNodes] = useState([]);
  const [customEdges, setCustomEdges] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const tabItems = [
    { id: 0, label: "Diagrams", icon: <BsDiagram3 /> },
    { id: 1, label: "Nodes", icon: <FaShareNodes /> },
    { id: 2, label: "Edges", icon: <MdCable /> },
  ];
  const [activeTab, setActiveTab] = useState(tabItems[0].id);

  const activeTabConfig = tabItems.find((item) => item.id === activeTab);
  const isPanelVisible = activeTab !== null;

  const loadDiagrams = async () => {
    try {
      const res = await fetch("/api/diagrams");
      const data = await res.json();
      setCustomDiagrams(data);
    } catch (err) {
      console.error("Error al cargar diagramas:", err);
    }
  };

  useEffect(() => {
    // Cargar diagramas al montar
    loadDiagrams();

    // Escuchar eventos de actualización
    window.addEventListener("diagrams-updated", loadDiagrams);
    return () => {
      window.removeEventListener("diagrams-updated", loadDiagrams);
    };
  }, []);

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const res = await fetch("/api/nodes");
        const data = await res.json();
        setCustomNodes(data); // aquí se guardan tus nodos de la DB
      } catch (err) {
        console.error("Error al cargar nodos:", err);
      }
    };
    fetchNodes();
  }, []);

  useEffect(() => {
    const fetchEdges = async () => {
      try {
        const res = await fetch("/api/edges");
        const data = await res.json();
        setCustomEdges(data);
      } catch (err) {
        console.error("Error al cargar edges:", err);
      }
    };
    fetchEdges();
  }, []);

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

  const handleDragEnd = () => {
    setType(null);
    setCode(null);
    setDragPayload(null);
  };

  const handleNavClick = (index, event) => {
    event.preventDefault();
    if (activeTab === index) {
      setActiveTab(null);
      setMenuOpenId(null);
    } else {
      setActiveTab(index);
    }
  };

  const popupAction = async (mode = "node") => {
    setPopupMode(mode);
    setIsPopupVisible(true);
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

  // Unified save handler so we can also switch to the right tab after save
  const handleSaveFromPopup = (code, name) => {
    if (popupMode === "edge") {
      handleSaveCustomEdge(code, name);
      setActiveTab(2); // switch to Edges tab
    } else {
      handleSaveCustomNode(code, name);
      setActiveTab(1); // switch to Nodes tab
    }
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
      setActiveTab(0);
    } catch (err) {
      console.error("Error al cargar el diagrama:", err);
      setPopupText(`Error al cargar el diagrama: ${err.message}`);
      setTimeout(() => setPopupText(""), 5000);
    }
  };

  const renderTabContent = () => {
    if (activeTab === null) {
      return null;
    }
    switch (activeTab) {
      case 0: // Diagram
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
                      onDelete={() => handleDeleteCustomDiagram(d.name)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 1: // Nodes
        return (
          <div className="tab-content">
            <div className="node-section">
              <div className="section-title">Input Nodes</div>
              <div
                className={`node-item ${
                  menuOpenId === "node-Base" ? "active" : ""
                }`}
                onDragStart={(event) => onDragStart(event, "Base")}
                onDragEnd={handleDragEnd}
                draggable
              >
                <div className="node-icon">
                  <FaApple />
                </div>
                Base Node
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
                onDragStart={(event) => onDragStart(event, "Input")}
                onDragEnd={handleDragEnd}
                draggable
              >
                <div className="node-icon">
                  <FaApple />
                </div>
                Input Node
                <LongMenu
                  className="kebab-menu"
                  onOpenChange={(open) =>
                    setMenuOpenId(open ? "node-Input" : null)
                  }
                />
              </div>
            </div>
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
      case 2: // Edges
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
      default:
        return null;
    }
  };

  return (
    <>
      <div className={`chatgpt-sidebar ${!isPanelVisible ? "collapsed" : ""}`}>
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
                onClick={(event) => handleNavClick(item.id, event)}
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
      </div>

      <CustomModal
        isVisible={isPopupVisible}
        onClose={() => setIsPopupVisible(false)}
        onSave={handleSaveFromPopup}
        initialCode={
          popupMode === "edge"
            ? `# Define tu arista personalizada aquí\n# def mi_arista(source, target, state):\n#     return state\n`
            : `# Edita el código del nodo a tus necesidades:\n\n# Función mínima para un nodo\ndef mi_nodo(state):\n    return state  # debe devolver el estado (o algo mergeable con él)`
        }
      />
    </>
  );
};

export default Sidebar;
