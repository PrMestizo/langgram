import React from "react";
import Editor from "@monaco-editor/react";

function Popup({ isVisible, onClose }) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="popup-overlay">
      <div className="popup-container">
        <button className="popup-close-btn" onClick={onClose}>
          &times;
        </button>
        <div className="popup-content">
          <h4>¡Mensaje de la aplicación!</h4>
          <div className="monaco-editor-container">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              defaultValue="// Escribe tu código aquí"
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
              }}
            />
          </div>
          <button className="poppup-close" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default Popup;
