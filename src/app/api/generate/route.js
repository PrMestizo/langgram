import OpenAI from "openai";

export async function POST(req) {
  try {
    const { graphJSON } = await req.json();

    const prompt = `
Transpila JSON→Python (LangGraph v1). Aplica SOLO estas reglas:

INPUT: JSON con {nodes:[{id,type,label?,code?}], edges:[{source,target}]}. Ignora cualquier otro campo.

REGLAS:
1) Importa: 
   from langgraph.graph import StateGraph, START, END
2) Inserta al inicio el code del nodo START exactamente tal cual.
3) Para cada nodo con type=NODE:
   - NAME = label si existe, si no id
   - func_name = slug(NAME) en snake_case ASCII
   - define: 
     def {func_name}(state: State) -> State:
         <pegar code del nodo>
4) Crea g = StateGraph(State) una sola vez.
5) Añade nodos: g.add_node("{NAME}", {func_name}) para cada NODE.
6) Traduce edges:
   - source START→ usa START
   - target END→ usa END
   - otros: usa "{NAME}" correspondiente
   - Emite g.add_edge(<src>, <dst>) en el orden dado.
7) Compila: app = g.compile() al final.
8) Si falta code en un NODE: usa raise NotImplementedError.
9) Salida: SOLO un bloque python sin texto extra ni comentarios.

Ahora transpila este JSON:
${JSON.stringify(graphJSON, null, 2)}
`;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("/api/generate error: OPENAI_API_KEY is not set");
      return new Response(
        JSON.stringify({
          error:
            "No se puede generar código porque falta configurar la variable de entorno OPENAI_API_KEY.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = new OpenAI({ apiKey });

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
    return new Response(JSON.stringify({ error: "Failed to generate code" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
