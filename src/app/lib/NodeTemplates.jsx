// Aqui se describe el codigo de cada nodo

const nodeCodeTemplates = {
  // Estructura base para el grafo --------------------------------------------------------------
  Base: `
      from typing import Annotated
  
      from typing_extensions import TypedDict
  
      from langgraph.graph import StateGraph, START, END
      from langgraph.graph.message import add_messages
      import os
      from langchain.chat_models import init_chat_model
  
      os.environ["OPENAI_API_KEY"] = "sk-333"
  
      llm = init_chat_model("openai:gpt-4.1")
  
  
      class State(TypedDict):
  
          messages: Annotated[list, add_messages]
  
  
      graph_builder = StateGraph(State)
    `,

  // Nodo conversacional --------------------------------------------------------------------------
  Conv: `
      def chatbot(state: State):
        return {"messages": [llm.invoke(state["messages"])]}
  
  
      graph_builder.add_node("chatbot", chatbot)
    `,

  // Nodo de compilado --------------------------------------------------------------------------
  Compile: `
      graph_builder.add_edge(START, "chatbot"),
      graph_builder.add_edge("chatbot", END)
      graph = graph_builder.compile()
      `,
};

export default nodeCodeTemplates;
