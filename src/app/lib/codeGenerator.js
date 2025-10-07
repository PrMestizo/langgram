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
      let errorMessage = `Error del servidor: ${res.status}`;
      try {
        const parsed = JSON.parse(text);
        if (parsed?.error) {
          if (typeof parsed.error === "string") {
            errorMessage = parsed.error;
          } else if (typeof parsed.error?.message === "string") {
            errorMessage = parsed.error.message;
          } else if (Array.isArray(parsed.error)) {
            errorMessage = parsed.error.join(" \u2022 ");
          } else {
            errorMessage = JSON.stringify(parsed.error);
          }
        }
      } catch (parseErr) {
        console.error(
          "No se pudo parsear el error de /api/generate:",
          parseErr
        );
        if (text) {
          errorMessage = `${errorMessage} ${text}`;
        }
      }
      throw new Error(
        String(errorMessage || "Error desconocido al generar el código")
      );
    }

    const data = await res.json();
    return data.code || "";
  } catch (err) {
    console.error("Error generando código:", err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("No se pudo generar el código");
  }
}
