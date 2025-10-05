"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
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
import { generateCodeFromGraph } from "../lib/codeGenerator";
import FilterEdge from "./FilterEdge";
import CustomModal from "./Modal";

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

const initialEdges = [
  {
    id: "n1-n2",
    source: "n1",
    target: "n2",
    type: "filterEdge",
    data: { filterCode: "", filterName: "" },
  },
];

const hydrateEdge = (edge) => ({
  id: edge.id || `${edge.source}-${edge.target}`,
  source: edge.source,
  target: edge.target,
  type: edge.type || "filterEdge",
  data: {
    ...(edge.data || {}),
    filterCode: edge.filterCode ?? edge.data?.filterCode ?? "",
    filterName: edge.filterName ?? edge.data?.filterName ?? "",
  },
});

function Diagram() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [type, setType, code, setCode] = useDnD();
  const { screenToFlowPosition } = useReactFlow();
  const [popupText, setPopupText] = useState("");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [diagramName, setDiagramName] = useState("");
  const [filterEditor, setFilterEditor] = useState({
    open: false,
    edgeId: null,
    name: "",
    code: "",
  });

  const handleFilterClick = useCallback(
    (edgeId) => {
      const targetEdge = edges.find((edge) => edge.id === edgeId);
      setFilterEditor({
        open: true,
        edgeId,
        name: targetEdge?.data?.filterName ?? "",
        code: targetEdge?.data?.filterCode ?? "",
      });
    },
    [edges]
  );

  const closeFilterEditor = useCallback(() => {
    setFilterEditor({ open: false, edgeId: null, name: "", code: "" });
  }, []);

  const handleFilterSave = useCallback(
    async (updatedCode, updatedName) => {
      const newEdge = {
        name: updatedName,
        code: updatedCode,
        language: "python",
      };
      try {
        const res = await fetch("/api/edges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEdge),
        });
        const saved = await res.json();
        setEdges((prev) => [...prev, saved]);
      } catch (err) {
        console.error("Error al guardar edge:", err);
      }
    },
    [closeFilterEditor, filterEditor.edgeId, setEdges]
  );

  useEffect(() => {
    if (!filterEditor.open) {
      return;
    }

    const edgeStillExists = edges.some(
      (edge) => edge.id === filterEditor.edgeId
    );
    if (!edgeStillExists) {
      closeFilterEditor();
    }
  }, [closeFilterEditor, edges, filterEditor.edgeId, filterEditor.open]);

  const edgeTypes = useMemo(
    () => ({
      filterEdge: (edgeProps) => (
        <FilterEdge {...edgeProps} onEditFilter={handleFilterClick} />
      ),
    }),
    [handleFilterClick]
  );

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
    (params) =>
      setEdges((edgesSnapshot) =>
        addEdge(
          {
            ...params,
            type: "filterEdge",
            data: { filterCode: "", filterName: "" },
          },
          edgesSnapshot
        )
      ),
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
      label: n.data.label,
      position: n.position,
      code: n.code || "# código no definido",
    }));

    const edgeData = edges.map((e) => ({
      source: e.source,
      target: e.target,
      id: e.id,
      type: e.type,
      filterCode: e.data?.filterCode || "",
      filterName: e.data?.filterName || "",
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
        const nextEdges = (graph.edges || []).map(hydrateEdge);
        setNodes(nextNodes);
        setEdges(nextEdges);
      } catch {}
    };
    window.addEventListener("load-diagram", handler);
    return () => window.removeEventListener("load-diagram", handler);
  }, [setNodes, setEdges]);

  return (
    <div className="dndflow">
      <header className="top-nav">
        <div className="top-nav__content">
          <span className="top-nav__brand">Langgram Studio</span>
          <div className="top-nav__actions">
            <button
              type="button"
              className="top-nav__button top-nav__button--primary"
              onClick={generateCodeWithAI}
            >
              Generar código
            </button>
            <button
              type="button"
              className="top-nav__button top-nav__button--secondary"
              onClick={openSaveDialog}
            >
              Guardar diagrama
            </button>
          </div>
        </div>
      </header>

      <div className="canvas-wrapper">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          edgeTypes={edgeTypes}
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
            const nextEdges = (graph.edges || []).map(hydrateEdge);
            setNodes(nextNodes);
            setEdges(nextEdges);
          } catch {}
        }}
      />

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
      <CustomModal
        isVisible={filterEditor.open}
        onClose={closeFilterEditor}
        onSave={handleFilterSave}
        initialCode={filterEditor.code}
        initialName={filterEditor.name}
        title="Configurar filtro condicional"
        nameLabel="Nombre del filtro"
        saveLabel="Guardar filtro"
        cancelLabel="Cancelar"
      />
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
