// Sidebar.jsx
"use client";
import { useEffect, useRef, useState } from "react";
import { useDnD } from "./DnDContext";
import Popup from "./pop-up";
import ContextMenu from "./contextMenu";
import LongMenu from "./KebabMenu";

const Sidebar = () => {
  const [, setType] = useDnD();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [customNodes, setCustomNodes] = useState([]);
  const [contextMenu, setContextMenu] = useState({
    position: { x: 0, y: 0 },
    toogle: false,
  });
  const contextMenuRef = useRef(null);
  const [menuOpenId, setMenuOpenId] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("customNodeTemplates");
      if (saved) setCustomNodes(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("customNodeTemplates", JSON.stringify(customNodes));
    } catch {}
  }, [customNodes]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (contextMenuRef.current) {
        if (!contextMenuRef.current.contains(e.target)) {
          setContextMenu({
            position: { x: 0, y: 0 },
            toogle: false,
          });
        }
      }
    }

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.setData("text/plain", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleNavClick = (index, event) => {
    event.preventDefault();
    setActiveTab(index);
  };

  const popupAction = async () => {
    setIsPopupVisible(true);
  };

  const handleSaveCustomNode = (code, nodeName) => {
    const name = nodeName;
    const newNode = { name, code, language: "python" };
    setCustomNodes((prev) => [...prev, newNode]);
  };

  const handleOnContextMenu = (e, rightClickItem) => {
    e.preventDefault();

    const contextMenuAttr = contextMenuRef.current.getBoundingClientRect();
    const isLeft = e.clientX < window?.innerWidth / 2;

    let x;
    let y = e.clientY;

    if (isLeft) {
      x = e.clientX;
    } else {
      x = e.clientX - contextMenuAttr.width;
    }

    setContextMenu({
      position: { x, y },
      toogle: true,
    });
    console.log(rightClickItem);
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
                    onDragStart={(event) => onDragStart(event, n.name)}
                    draggable
                  >
                    <div
                      className="node-icon"
                      style={{ background: "#64748b", color: "white" }}
                    >
                      A
                    </div>
                    {n.name}
                    <LongMenu
                      className="kebab-menu"
                      onOpenChange={(open) =>
                        setMenuOpenId(open ? `custom-${n.name}` : null)
                      }
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="sidebar-action-buttons">
              <button
                className="sidebar-action-btn primary"
                onClick={popupAction}
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
              <div className="node-item">
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
              <div className="node-item">
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
            <div className="sidebar-action-buttons">
              <button
                className="sidebar-action-btn primary"
                onClick={popupAction}
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
        onSave={handleSaveCustomNode}
        initialCode={`# Edita el código del nodo a tus necesidades:\n\n# Función mínima para un nodo\ndef mi_nodo(state):\n    return state  # debe devolver el estado (o algo mergeable con él)`}
      />
      <ContextMenu
        positionX={contextMenu.position.x}
        positionY={contextMenu.position.y}
        isToggled={contextMenu.toogle}
        buttons={[
          { text: "Editar", onClick: () => {} },
          { text: "Otro", onClick: () => {} },
          { isSeparator: true },
          { text: "Eliminar", onClick: () => {} },
        ]}
        contextMenuRef={contextMenuRef}
      />
    </>
  );
};

export default Sidebar;
