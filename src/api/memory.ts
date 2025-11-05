import axios from "axios";

const API_BASE = "http://127.0.0.1:8000"; // backend host/port

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

/**
 * Add messages (chunk) to the user's memory KG
 */
export async function addChunk(request: AddChunkRequest): Promise<{ status: string }> {
  const res = await axios.post(`${API_BASE}/memory/add_chunk`, request, {
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
}

/**
 * Retrieve relevant memory context for a query
 */
export async function retrieveContext(
  request: RetrieveContextRequest
): Promise<{ context: string }> {
  const res = await axios.post(`${API_BASE}/memory/retrieve_context`, request, {
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
}

export const fetchGraph = async (profile: string) => {
  const response = await fetch(`/api/graph/${profile}`);
  if (!response.ok) throw new Error("Failed to fetch graph");
  return response.json();
};
