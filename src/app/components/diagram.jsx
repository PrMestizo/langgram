"use client";
import { useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
} from "reactflow";

import "reactflow/dist/style.css";
import Sidebar from "./Sidebar";
import { DnDProvider, useDnD } from "./DnDContext";
import nodeCodeTemplates from "../lib/NodeTemplates";
import { generateCodeFromGraph } from "../lib/codeGenerator";

let id = 0;
const getId = () => `dndnode_${id++}`;

const initialNodes = [
  {
    id: "n1",
    type: "Base",
    position: { x: 0, y: 0 },
    data: { label: "Base" },
  },
  {
    id: "n2",
    type: "Compile",
    position: { x: 0, y: 100 },
    data: { label: "Compile" },
  },
];

const initialEdges = [{ id: "n1-n2", source: "n1", target: "n2" }];

function Diagram() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [type, setType, code, setCode] = useDnD();
  const { screenToFlowPosition } = useReactFlow();
  const [popupText, setPopupText] = useState("");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [diagramName, setDiagramName] = useState("");

  const onNodesChange = useCallback(
    (changes) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    []
  );
  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    []
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      if (!type || !code) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `${type}` },
        code,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, type, code]
  );

  const onDragStart = (event, nodeType, nodeCode) => {
    setType(nodeType);
    setCode(nodeCode);
    event.dataTransfer.setData("application/node-type", nodeType);
    event.dataTransfer.setData("application/node-code", nodeCode);
    event.dataTransfer.effectAllowed = "move";
  };

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

  const saveDiagram = () => {
    const graph = GraphJSON();
    try {
      const key = "customDiagrams";
      const existingRaw = localStorage.getItem(key);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const newEntry = {
        name:
          diagramName && diagramName.trim()
            ? diagramName.trim()
            : `Diagram ${existing.length + 1}`,
        graph,
        savedAt: new Date().toISOString(),
      };
      // If a diagram with same name exists, replace it; otherwise append
      const idx = existing.findIndex((d) => d.name === newEntry.name);
      let updated;
      if (idx >= 0) {
        updated = [...existing];
        updated[idx] = newEntry;
      } else {
        updated = [...existing, newEntry];
      }
      localStorage.setItem(key, JSON.stringify(updated));
      // Notify other components in the same tab to refresh
      try {
        window.dispatchEvent(new Event("diagrams-updated"));
      } catch {}
      setIsSaveDialogOpen(false);
      setDiagramName("");
    } catch (e) {
      setPopupText("Error al guardar el diagrama");
    }
  };

  const GraphJSON = () => {
    const nodeData = nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.data.label,
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
      <div style={{ width: "100vw", height: "100vh" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap
            nodeStrokeColor={(n) => {
              if (n.type === "Base") return "#0041d0";
              if (n.type === "Conv") return "#4ea34eff";
              if (n.type === "Compile") return "#ff0072";
            }}
          />
        </ReactFlow>
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
  <ReactFlowProvider>
    <DnDProvider>
      <Diagram />
    </DnDProvider>
  </ReactFlowProvider>
);

export default DiagramWithProviders;
