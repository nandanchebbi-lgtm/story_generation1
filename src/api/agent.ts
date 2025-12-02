// src/api/agent.ts
import axiosInstance from "./axiosConfig";

export interface GraphState {
  nodes: { id: string; label: string }[];
  edges: { from: string; to: string }[];
}

// Fetch the knowledge graph for a profile
export async function fetchKnowledgeGraph(profile: string): Promise<GraphState> {
  const res = await axiosInstance.get(`/api/agent/state`, {
    params: { profile },
  });

  if (res.status !== 200) throw new Error("Failed to fetch graph state");

  const data = res.data;
  return {
    nodes: data.knowledge_graph_nodes.map((id: string) => ({ id, label: id })),
    edges: data.knowledge_graph_edges.map((e: [string, string]) => ({
      from: e[0],
      to: e[1],
    })),
  };
}