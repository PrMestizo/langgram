// codeGenerator.js (client-side helper that calls our API route)

/**
 * Genera código Python a partir del JSON de nodos y edges llamando a /api/generate
 * @param {Object} graphJSON - { nodes: [...], edges: [...] }
 * @returns {Promise<string>} - Código Python ensamblado
 */
export async function generateCodeFromGraph(graphJSON) {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graphJSON }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Error del servidor: ${res.status} ${text}`);
    }

    const data = await res.json();
    return data.code || "";
  } catch (err) {
    console.error("Error generando código:", err);
    throw new Error("No se pudo generar el código");
  }
}
