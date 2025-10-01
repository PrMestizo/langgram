// Sidebar.jsx
"use client";
import { useEffect, useState } from "react";
import { useDnD } from "./DnDContext";
import Popup from "./pop-up";
import LongMenu from "./KebabMenu";

const Sidebar = ({ onLoadDiagram }) => {
  const [, setType, , setCode] = useDnD();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupMode, setPopupMode] = useState("node");
  const [customDiagrams, setCustomDiagrams] = useState([]);
  const [customNodes, setCustomNodes] = useState([]);
  const [customEdges, setCustomEdges] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState(null);

  /*useEffect(() => {
    const loadDiagrams = () => {
      try {
        const saved = localStorage.getItem("customDiagrams");
        setCustomDiagrams(saved ? JSON.parse(saved) : []);
      } catch {}
    };

    // 🔹 Cargar al montar
    loadDiagrams();

    // 🔹 Escuchar actualizaciones
    window.addEventListener("diagrams-updated", loadDiagrams);
    return () => window.removeEventListener("diagrams-updated", loadDiagrams);
  }, []);*/

  useEffect(() => {
    const fetchDiagrams = async () => {
      try {
        const res = await fetch("/api/diagrams");
        const data = await res.json();
        setCustomDiagrams(data);
      } catch (err) {
        console.error("Error al cargar diagramas:", err);
      }
    };
    fetchDiagrams();
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

  const onDragStart = (event, nodeType, nodeCode) => {
    setType(nodeType);
    setCode(nodeCode);
    event.dataTransfer.setData("application/node-type", nodeType);
    event.dataTransfer.setData("application/node-code", nodeCode);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleNavClick = (index, event) => {
    event.preventDefault();
    setActiveTab(index);
  };

  const popupAction = async (mode = "node") => {
    setPopupMode(mode);
    setIsPopupVisible(true);
  };

  const handleDeleteCustomDiagram = (diagramName) => {
    setCustomDiagrams((prevDiagrams) => {
      const updated = prevDiagrams.filter(
        (diagram) => diagram.name !== diagramName
      );
      localStorage.setItem("customDiagrams", JSON.stringify(updated));
      return updated;
    });
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
      if (onLoadDiagram) {
        onLoadDiagram(diagram.graph);
      } else {
        window.dispatchEvent(
          new CustomEvent("load-diagram", { detail: diagram.graph })
        );
      }
      setActiveTab(0);
    } catch {}
  };

  const renderTabContent = () => {
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
                <div className="node-icon" style={{ background: "#4f46e5" }}>
                  📊
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
                <div className="node-icon" style={{ background: "#ec4899" }}>
                  💾
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
                    <div
                      className="node-icon"
                      style={{ background: "#22c55e" }}
                    >
                      📁
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
                draggable
              >
                <div className="node-icon base">B</div>
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
                draggable
              >
                <div className="node-icon" style={{ background: "#3b82f6" }}>
                  I
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
                    draggable
                  >
                    <div
                      className="node-icon"
                      style={{ background: "#64748b", color: "white" }}
                    >
                      B
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
                className={`node-item ${
                  menuOpenId === "node-Input" ? "active" : ""
                }`}
                onDragStart={(event) => onDragStart(event, "Input")}
                draggable
              >
                <div className="node-icon" style={{ background: "#ef4444" }}>
                  →
                </div>
                Direct Connection
                <LongMenu
                  className="kebab-menu"
                  onOpenChange={(open) =>
                    setMenuOpenId(open ? "node-Base" : null)
                  }
                />
              </div>
              <div
                className="node-item"
                onDragStart={(event) => onDragStart(event, "Input")}
                draggable
              >
                <div className="node-icon" style={{ background: "#f97316" }}>
                  ⤴
                </div>
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
                    className={`node-item ${
                      menuOpenId === `custom-${item.name}` ? "active" : ""
                    }`}
                    onDragStart={(event) =>
                      onDragStart(event, item.name, item.code)
                    }
                    draggable
                  >
                    <div
                      className="node-icon"
                      style={{ background: "#64748b", color: "white" }}
                    >
                      A
                    </div>
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
      {/* ChatGPT-style Sidebar */}
      <div className={`chatgpt-sidebar ${!sidebarOpen ? "closed" : ""}`}>
        <div className="sidebar-header">
          <div className="nav-tabs">
            <div className={`nav-tab ${activeTab === 0 ? "active" : ""}`}>
              <button
                className="nav-tab-button"
                onClick={(e) => handleNavClick(0, e)}
              >
                <span className="nav-tab-icon">⚡</span>
                <span>Diagram</span>
              </button>
            </div>
            <div className={`nav-tab ${activeTab === 1 ? "active" : ""}`}>
              <button
                className="nav-tab-button"
                onClick={(e) => handleNavClick(1, e)}
              >
                <span className="nav-tab-icon">🎯</span>
                <span>Nodes</span>
              </button>
            </div>
            <div className={`nav-tab ${activeTab === 2 ? "active" : ""}`}>
              <button
                className="nav-tab-button"
                onClick={(e) => handleNavClick(2, e)}
              >
                <span className="nav-tab-icon">🔗</span>
                <span>Edges</span>
              </button>
            </div>
            <div className={`nav-indicator tab-${activeTab}`}></div>
          </div>
        </div>
        <div className="sidebar-content">{renderTabContent()}</div>
      </div>

      {/* Sidebar Toggle */}
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <div className={`hamburger ${sidebarOpen ? "open" : ""}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      <Popup
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
