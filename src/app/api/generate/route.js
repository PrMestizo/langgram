import OpenAI from "openai";

export async function POST(req) {
  try {
    const { graphJSON } = await req.json();

    const prompt = `
Eres un generador de código para LangGraph.
Dado este JSON, construye un script Python válido que haga que el chatbot hecho con LangGraph tenga sentido.
${JSON.stringify(graphJSON, null, 2)}

Devuelve un script válido que:
1. Importe lo necesario.
2. Defina las funciones de cada nodo.
3. Construya un StateGraph con esos nodos y edges.
4. Compile el grafo listo para ejecutarse.
`;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const code = completion.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ code }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("/api/generate error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to generate code" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
