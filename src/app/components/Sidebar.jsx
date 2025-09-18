// Sidebar.jsx
"use client";
import { useState } from "react";
import { useDnD } from "./DnDContext";
import Popup from "../lib/pop-up";

const Sidebar = () => {
  const [, setType] = useDnD();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [isPopupVisible, setIsPopupVisible] = useState(false);

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Diagram
        return (
          <div className="tab-content">
            <div className="node-section">
              <div className="section-title">Diagram Tools</div>
              <div className="node-item">
                <div className="node-icon" style={{ background: "#4f46e5" }}>
                  📊
                </div>
                Create Flow
              </div>
              <div className="node-item">
                <div className="node-icon" style={{ background: "#7c3aed" }}>
                  🎨
                </div>
                Design Layout
              </div>
              <div className="node-item">
                <div className="node-icon" style={{ background: "#ec4899" }}>
                  💾
                </div>
                Save Diagram
              </div>
            </div>
            <div className="node-section">
              <div className="section-title">View Options</div>
              <div className="node-item">
                <div className="node-icon" style={{ background: "#06b6d4" }}>
                  🔍
                </div>
                Zoom Controls
              </div>
              <div className="node-item">
                <div className="node-icon" style={{ background: "#10b981" }}>
                  📐
                </div>
                Grid Toggle
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
                className="node-item"
                onDragStart={(event) => onDragStart(event, "Base")}
                draggable
              >
                <div className="node-icon base">B</div>
                Base Node
              </div>
              <div
                className="node-item"
                onDragStart={(event) => onDragStart(event, "Input")}
                draggable
              >
                <div className="node-icon" style={{ background: "#3b82f6" }}>
                  I
                </div>
                Input Node
              </div>
            </div>
            <div className="node-section">
              <div className="section-title">Processing Nodes</div>
              <div
                className="node-item"
                onDragStart={(event) => onDragStart(event, "Conv")}
                draggable
              >
                <div className="node-icon conv">C</div>
                Conversation Node
              </div>
              <div
                className="node-item"
                onDragStart={(event) => onDragStart(event, "Transform")}
                draggable
              >
                <div className="node-icon" style={{ background: "#f59e0b" }}>
                  T
                </div>
                Transform Node
              </div>
            </div>
            <div className="node-section">
              <div className="section-title">Output Nodes</div>
              <div
                className="node-item"
                onDragStart={(event) => onDragStart(event, "Compile")}
                draggable
              >
                <div className="node-icon compile">O</div>
                Compile Node
              </div>
              <div
                className="node-item"
                onDragStart={(event) => onDragStart(event, "Export")}
                draggable
              >
                <div className="node-icon" style={{ background: "#8b5cf6" }}>
                  E
                </div>
                Export Node
              </div>
            </div>
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
              </div>
              <div className="node-item">
                <div className="node-icon" style={{ background: "#f97316" }}>
                  ⤴
                </div>
                Conditional Flow
              </div>
              <div className="node-item">
                <div className="node-icon" style={{ background: "#eab308" }}>
                  ↻
                </div>
                Loop Connection
              </div>
            </div>
            <div className="node-section">
              <div className="section-title">Edge Properties</div>
              <div className="node-item">
                <div className="node-icon" style={{ background: "#22c55e" }}>
                  ⚡
                </div>
                Connection Speed
              </div>
              <div className="node-item">
                <div className="node-icon" style={{ background: "#06b6d4" }}>
                  🏷️
                </div>
                Label Editor
              </div>
              <div className="node-item">
                <div className="node-icon" style={{ background: "#8b5cf6" }}>
                  🎨
                </div>
                Style Options
              </div>
            </div>
            <div className="node-section">
              <div className="section-title">Actions</div>
              <div className="node-item">
                <div className="node-icon" style={{ background: "#dc2626" }}>
                  🗑️
                </div>
                Delete Edge
              </div>
              <div className="node-item">
                <div className="node-icon" style={{ background: "#7c3aed" }}>
                  ⚙️
                </div>
                Edit Properties
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
      />
    </>
  );
};

export default Sidebar;
