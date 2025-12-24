// src/api/apiClient.ts
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api/gpt4v`,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;