// src/api/agent.ts
export interface GraphState {
  nodes: { id: string; label: string }[];
  edges: { from: string; to: string }[];
}

// Fetch the knowledge graph for a profile
export async function fetchKnowledgeGraph(profile: string): Promise<GraphState> {
  const res = await fetch(`http://127.0.0.1:8000/agent/state`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      // optionally pass profile info if needed in headers or query
    },
  });

  if (!res.ok) throw new Error("Failed to fetch graph state");
  const data = await res.json();
  return {
    nodes: data.knowledge_graph_nodes.map((id: string) => ({ id, label: id })),
    edges: data.knowledge_graph_edges.map((e: [string, string]) => ({ from: e[0], to: e[1] })),
  };
}
