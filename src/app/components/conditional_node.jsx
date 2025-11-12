import { useCallback } from "react";
import { Handle, Position } from "reactflow";

// Un nodo básico de React Flow con manejadores de entrada y salida
export function ConditionalNode({ data }) {
  // Puedes acceder a las props del nodo a través de `data`
  const { label = "Nodo condicional" } = data;

  // Función que se ejecuta cuando cambia algún valor en el nodo
  const onChange = useCallback((evt) => {
    console.log("Valor cambiado:", evt.target.value);
    // Aquí puedes actualizar el estado del nodo si es necesario
  }, []);

  return (
    <div className="diamond-node">
      {/* Manejador de entrada (conexión desde arriba) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 8,
          height: 8,
          background: "#555",
          border: "1px solid red",
          borderRadius: "50%",
          top: -18,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3,
        }}
      />

      <div className="diamond-content">
        <div className="node-label">{label}</div>
      </div>

      {/* Manejador de salida (conexión hacia abajo) */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 8,
          height: 8,
          background: "#555",
          border: "1px solid red",
          borderRadius: "50%",
          bottom: -18,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3,
        }}
      />

      <style jsx>{`
        .diamond-node {
          width: 80px;
          height: 80px;
          position: relative;
          margin: 20px;
        }
        .diamond-node::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border: 1px solid rgba(148, 163, 184, 0.4);
          background: linear-gradient(135deg, #f8fafc, #eef2ff);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.1);
          color: #0f172a;
          transform: rotate(45deg);
          z-index: 1;
        }
        .diamond-content {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }
        .node-label {
          text-align: center;
          font-size: 12px;
          font-weight: bold;
          max-width: 80%;
          word-break: break-word;
          /* El texto ya no se rota */
        }
      `}</style>
    </div>
  );
}
