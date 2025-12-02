// src/api/axiosConfig.ts
import axios from "axios";
import type { AxiosInstance } from "axios";

/**
 * Resolve API root (no trailing slash, no '/api' at the end).
 *
 * Works if VITE_API_BASE is either:
 * - "http://host:8000"
 * - "http://host:8000/"
 * - "http://host:8000/api"
 * - "http://host:8000/api/"
 */
function resolveApiRoot(): string {
  // runtime override (e.g. window.__API_BASE__ if you inject it)
  const runtime = (window as any).__API_BASE__;
  if (runtime && runtime.trim() !== "") {
    return runtime.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }

  // build-time Vite variable
  const viteBase = import.meta.env.VITE_API_BASE;
  if (viteBase && viteBase.trim() !== "") {
    return viteBase.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }

  // fallback
  return "http://localhost:8000";
}

export const API_ROOT = resolveApiRoot();       // e.g. "http://192.168.68.101:8000"
export const API_BASE = `${API_ROOT}/api`;      // e.g. "http://192.168.68.101:8000/api"

// Axios instance uses API_ROOT (so axios calls should include "/api/..." in path)
const api: AxiosInstance = axios.create({
  baseURL: API_ROOT,
  timeout: 15000,
  // you can set withCredentials if needed
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("[Axios Error]", err);
    return Promise.reject(err);
  }
);

export { api };
export default api;