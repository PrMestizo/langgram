"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { Stage, Layer, Group, Rect, Circle, Text, Arrow } from "react-konva";

import "reactflow/dist/style.css";
import Sidebar from "./Sidebar";
import { DnDProvider, useDnD } from "./DnDContext";
import { generateCodeFromGraph } from "../lib/codeGenerator";

let id = 0;
const getId = () => `dndnode_${id++}`;

const NODE_WIDTH = 160;
const NODE_HEIGHT = 80;
const HANDLE_RADIUS = 6;

const initialNodes = [
  {
    id: "n1",
    type: "Base",
    position: { x: 450, y: 300 },
    data: { label: "Base" },
    code: "",
  },
  {
    id: "n2",
    type: "Compile",
    position: { x: 650, y: 300 },
    data: { label: "Compile" },
    code: "",
  },
];

const initialEdges = [{ id: "n1-n2", source: "n1", target: "n2" }];

function Diagram() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [draggedType, setDraggedType, draggedCode, setDraggedCode] = useDnD();
  const [popupText, setPopupText] = useState("");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [diagramName, setDiagramName] = useState("");
  const [connectionStart, setConnectionStart] = useState(null);
  const stageRef = useRef(null);
  const stageContainerRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const getHandlePosition = useCallback((node, handleType) => {
    const { x = 0, y = 0 } = node.position || {};
    if (handleType === "source") {
      return { x: x + NODE_WIDTH, y: y + NODE_HEIGHT / 2 };
    }
    return { x, y: y + NODE_HEIGHT / 2 };
  }, []);

  useEffect(() => {
    const updateStageSize = () => {
      const container = stageContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setStageSize({ width: rect.width, height: rect.height });
    };

    updateStageSize();
    window.addEventListener("resize", updateStageSize);
    return () => window.removeEventListener("resize", updateStageSize);
  }, []);

  const handleNodeDragMove = useCallback((nodeId, event) => {
    const { x, y } = event.target.position();
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId ? { ...node, position: { x, y } } : node
      )
    );
  }, []);

  const handleConnectionStart = useCallback((nodeId, handleType, event) => {
    event.cancelBubble = true;
    setConnectionStart({ nodeId, handleType });
  }, []);

  const handleConnectionEnd = useCallback(
    (nodeId, handleType, event) => {
      event.cancelBubble = true;
      if (!connectionStart) return;

      if (
        connectionStart.nodeId === nodeId &&
        connectionStart.handleType === handleType
      ) {
        setConnectionStart(null);
        return;
      }

      let sourceId = null;
      let targetId = null;

      if (connectionStart.handleType === "source" && handleType === "target") {
        sourceId = connectionStart.nodeId;
        targetId = nodeId;
      } else if (
        connectionStart.handleType === "target" &&
        handleType === "source"
      ) {
        sourceId = nodeId;
        targetId = connectionStart.nodeId;
      }

      if (sourceId && targetId) {
        const edgeId = `${sourceId}-${targetId}-${Date.now()}`;
        setEdges((prev) => {
          if (
            prev.some(
              (edge) => edge.source === sourceId && edge.target === targetId
            )
          ) {
            return prev;
          }
          return [...prev, { id: edgeId, source: sourceId, target: targetId }];
        });
      }

      setConnectionStart(null);
    },
    [connectionStart]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      if (!draggedType) {
        return;
      }

      const stage = stageRef.current;
      if (!stage) {
        return;
      }

      const rect = stage.container().getBoundingClientRect();
      const position = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const resolvedCode =
        draggedCode ?? nodeCodeTemplates[draggedType] ?? "# código no definido";

      const newNode = {
        id: getId(),
        type: draggedType,
        position,
        data: { label: `${draggedType}` },
        code: resolvedCode,
      };

      setNodes((nds) => nds.concat(newNode));
      setDraggedType(null);
      setDraggedCode(null);
    },
    [draggedType, draggedCode, setDraggedType, setDraggedCode]
  );

  const generateCodeWithAI = async () => {
    const graphJSON = GraphJSON();
    try {
      const code = await generateCodeFromGraph(graphJSON);
      setPopupText(code);
    } catch {
      setPopupText("Error al generar el código con IA");
    }
  };

  const JSONtoFile = async () => {
    const graphJSON = GraphJSON();
    try {
      const formattedJSON = JSON.stringify(graphJSON, null, 2);
      setPopupText(formattedJSON);
    } catch {
      setPopupText("Error al generar el código con IA");
    }
  };

  const openSaveDialog = () => {
    setDiagramName("");
    setIsSaveDialogOpen(true);
  };

  const saveDiagram = async () => {
    const graph = GraphJSON();
    try {
      const name = diagramName || `Diagrama ${new Date().toLocaleString()}`;

      const res = await fetch("/api/diagrams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          content: graph, // Cambiado de 'graph' a 'content' para que coincida con el modelo
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al guardar el diagrama");
      }

      // Disparar evento para actualizar la lista de diagramas
      window.dispatchEvent(new Event("diagrams-updated"));

      // Cerrar el diálogo y limpiar el nombre
      setIsSaveDialogOpen(false);
      setDiagramName("");

      // Mostrar mensaje de éxito
      setPopupText(`¡Diagrama "${name}" guardado exitosamente!`);
      setTimeout(() => setPopupText(""), 5000);
    } catch (err) {
      console.error("Error al guardar el diagrama:", err);
      setPopupText(`Error al guardar el diagrama: ${err.message}`);
      setTimeout(() => setPopupText(""), 5000);
    }
  };

  const GraphJSON = () => {
    const nodeData = nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.data?.label || "",
      position: n.position,
      code: n.code || "# código no definido",
    }));

    const edgeData = edges.map((e) => ({
      source: e.source,
      target: e.target,
      id: e.id,
    }));

    const graphJSON = { nodes: nodeData, edges: edgeData };
    return graphJSON;
  };

  // Listen for external load requests from the Sidebar
  // Expected payload: { nodes: [{id,type,label,position,code}], edges: [{id,source,target}] }
  // Rebuilds React Flow state accordingly
  useEffect(() => {
    const handler = (ev) => {
      const graph = ev?.detail;
      if (!graph) return;
      try {
        const nextNodes = (graph.nodes || []).map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position || { x: 0, y: 0 },
          data: { label: n.label },
          code: n.code,
        }));
        const nextEdges = (graph.edges || []).map((e) => ({
          id: e.id || `${e.source}-${e.target}`,
          source: e.source,
          target: e.target,
        }));
        setNodes(nextNodes);
        setEdges(nextEdges);
      } catch {}
    };
    window.addEventListener("load-diagram", handler);
    return () => window.removeEventListener("load-diagram", handler);
  }, [setNodes, setEdges]);

  return (
    <div className="dndflow">
      <div
        ref={stageContainerRef}
        style={{ width: "100vw", height: "100vh" }}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onMouseUp={() => setConnectionStart(null)}
        >
          <Layer>
            {edges.map((edge) => {
              const sourceNode = nodes.find((n) => n.id === edge.source);
              const targetNode = nodes.find((n) => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;

              const sourcePos = getHandlePosition(sourceNode, "source");
              const targetPos = getHandlePosition(targetNode, "target");

              return (
                <Arrow
                  key={edge.id}
                  points={[sourcePos.x, sourcePos.y, targetPos.x, targetPos.y]}
                  stroke="#888"
                  fill="#888"
                  strokeWidth={2}
                  pointerWidth={8}
                />
              );
            })}
            {nodes.map((node) => (
              <Group
                key={node.id}
                x={node.position?.x || 0}
                y={node.position?.y || 0}
                draggable
                onDragMove={(event) => handleNodeDragMove(node.id, event)}
              >
                <Rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  fill="#1e293b"
                  stroke="#64748b"
                  strokeWidth={1}
                  cornerRadius={8}
                />
                <Text
                  text={node.data?.label || node.type}
                  fill="#f8fafc"
                  fontSize={16}
                  padding={12}
                  width={NODE_WIDTH}
                />
                <Circle
                  x={0}
                  y={NODE_HEIGHT / 2}
                  radius={HANDLE_RADIUS}
                  fill="#38bdf8"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  onMouseDown={(event) =>
                    handleConnectionStart(node.id, "target", event)
                  }
                  onTouchStart={(event) =>
                    handleConnectionStart(node.id, "target", event)
                  }
                  onMouseUp={(event) =>
                    handleConnectionEnd(node.id, "target", event)
                  }
                  onTouchEnd={(event) =>
                    handleConnectionEnd(node.id, "target", event)
                  }
                />
                <Circle
                  x={NODE_WIDTH}
                  y={NODE_HEIGHT / 2}
                  radius={HANDLE_RADIUS}
                  fill="#f97316"
                  stroke="#ea580c"
                  strokeWidth={2}
                  onMouseDown={(event) =>
                    handleConnectionStart(node.id, "source", event)
                  }
                  onTouchStart={(event) =>
                    handleConnectionStart(node.id, "source", event)
                  }
                  onMouseUp={(event) =>
                    handleConnectionEnd(node.id, "source", event)
                  }
                  onTouchEnd={(event) =>
                    handleConnectionEnd(node.id, "source", event)
                  }
                />
              </Group>
            ))}
          </Layer>
        </Stage>
      </div>

      <Sidebar
        onLoadDiagram={(graph) => {
          try {
            const nextNodes = (graph.nodes || []).map((n) => ({
              id: n.id,
              type: n.type,
              position: n.position || { x: 0, y: 0 },
              data: { label: n.label },
              code: n.code,
            }));
            const nextEdges = (graph.edges || []).map((e) => ({
              id: e.id || `${e.source}-${e.target}`,
              source: e.source,
              target: e.target,
            }));
            setNodes(nextNodes);
            setEdges(nextEdges);
          } catch {}
        }}
      />
      <div className="button-container">
        <button className="button" onClick={generateCodeWithAI}>
          Generar Código
        </button>
        <button className="button" onClick={openSaveDialog}>
          Guardar Diagrama
        </button>
      </div>

      {/* Popup  */}
      {popupText && (
        <div className="poppup-text">
          <pre>{popupText}</pre>
          <button className="poppup.close" onClick={() => setPopupText("")}>
            Cerrar
          </button>
        </div>
      )}

      {/* Save Diagram Name Dialog */}
      {isSaveDialogOpen && (
        <div className="poppup-text" style={{ maxWidth: 480 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>
            Guardar Diagrama
          </div>
          <label
            htmlFor="diagram-name"
            style={{ display: "block", marginBottom: 4 }}
          >
            Nombre del diagrama
          </label>
          <input
            id="diagram-name"
            type="text"
            value={diagramName}
            onChange={(e) => setDiagramName(e.target.value)}
            placeholder="Mi diagrama"
            style={{ width: "100%", padding: 8, marginBottom: 12 }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="button"
              onClick={() => setIsSaveDialogOpen(false)}
            >
              Cancelar
            </button>
            <button className="button" onClick={saveDiagram}>
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const DiagramWithProviders = () => (
  <DnDProvider>
    <Diagram />
  </DnDProvider>
);

export default DiagramWithProviders;
