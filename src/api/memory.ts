// src/api/memory.ts
import axiosInstance from "./axiosConfig";

// --- Types ---
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface AddChunkRequest {
  messages: Message[];
  photo_name?: string;
}

export interface RetrieveContextRequest {
  query: string;
  top_k?: number;
}

export interface GraphNode {
  id: string;
  label?: string;
  type?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  relation?: string;
}

// --- Memory API ---

/** Add messages (chunk) to the user's memory KG */
export async function addChunk(
  request: AddChunkRequest
): Promise<{ status: string }> {
  const res = await axiosInstance.post(`/memory/add_chunk`, request, {
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
}

/** Retrieve relevant memory context for a query */
export async function retrieveContext(
  request: RetrieveContextRequest
): Promise<{ context: string }> {
  const res = await axiosInstance.post(`/memory/retrieve_context`, request, {
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
}

/** Fetch entire graph for a profile */
export const fetchGraph = async (profile: string) => {
  const res = await axiosInstance.get(`/graph/${profile}`);
  if (res.status !== 200) throw new Error("Failed to fetch graph");
  return res.data;
};