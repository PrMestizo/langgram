// codeGenerator.js
import OpenAI from "openai";

// Cliente OpenAI (usa tu API Key desde .env.local)
const client = new OpenAI({
  //apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  apiKey:
    "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",
  dangerouslyAllowBrowser: true, // 👈 necesario si llamas desde el cliente
});

/**
 * Genera código Python a partir del JSON de nodos y edges
 * @param {Object} graphJSON - { nodes: [...], edges: [...] }
 * @returns {Promise<string>} - Código Python ensamblado
 */
export async function generateCodeFromGraph(graphJSON) {
  const prompt = `
Eres un generador de código para LangGraph.
Dado este JSON, construye un script Python válido que haga que el chatbot hecho on langgraph tenga sentido.
${JSON.stringify(graphJSON, null, 2)}

Devuelve un script válido que:
1. Importe lo necesario.
2. Defina las funciones de cada nodo.
3. Construya un StateGraph con esos nodos y edges.
4. Compile el grafo listo para ejecutarse.
`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content;
  } catch (err) {
    console.error("Error generando código:", err);
    throw new Error("No se pudo generar el código");
  }
}
