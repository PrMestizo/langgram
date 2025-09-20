"use client";
import React, { useState } from "react";
import Editor from "@monaco-editor/react";

function Popup({ isVisible, onClose, onSave, initialCode = "" }) {
  if (!isVisible) {
    return null;
  }

  const [code, setCode] = useState(initialCode);
  const [nodeName, setNodeName] = useState("");

  return (
    <div className="popup-overlay">
      <div className="popup-container">
        <button className="popup-close-btn" onClick={onClose}>
          &times;
        </button>
        <div className="popup-content">
          <h3>Editor de nodo personalizado</h3>
          <div className="input-container">
            <input
              id="node-name"
              className="input"
              type="text"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              placeholder=" "
            />
            <label className="label" htmlFor="node-name">
              Nombre del nodo
            </label>
          </div>
          <div className="monaco-editor-container">
            <Editor
              height="100%"
              defaultLanguage="python"
              value={code}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
              }}
              onChange={(val) => setCode(val ?? "")}
            />
          </div>
          <div>
            <button
              className="button popup"
              onClick={() => {
                onSave?.(code, nodeName);
                onClose?.();
              }}
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Popup;
