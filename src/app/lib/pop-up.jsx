import React from "react";

function Popup({ isVisible, onClose }) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-container" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close-btn" onClick={onClose}>
          &times;
        </button>
        <div className="popup-content">
          <h4>¡Mensaje de la aplicación!</h4>
          <button className="poppup-close" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default Popup;
