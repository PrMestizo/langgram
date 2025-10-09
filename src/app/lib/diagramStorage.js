import Dexie from "dexie";

let diagramsTable = null;

if (typeof window !== "undefined") {
  const db = new Dexie("LanggramDiagramDB");
  db.version(1).stores({
    diagrams: "&id, updatedAt",
  });
  diagramsTable = db.table("diagrams");
}

export async function loadPersistedDiagram() {
  if (!diagramsTable) {
    return null;
  }

  try {
    const storedDiagram = await diagramsTable.get("current");
    return storedDiagram?.graph ?? null;
  } catch (error) {
    console.error("Error al cargar el diagrama guardado localmente:", error);
    return null;
  }
}

export async function savePersistedDiagram(graph) {
  if (!diagramsTable) {
    return;
  }

  try {
    await diagramsTable.put({
      id: "current",
      graph,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error al guardar el diagrama localmente:", error);
  }
}

export async function clearPersistedDiagram() {
  if (!diagramsTable) {
    return;
  }

  try {
    await diagramsTable.delete("current");
  } catch (error) {
    console.error("Error al limpiar el diagrama local:", error);
  }
}
