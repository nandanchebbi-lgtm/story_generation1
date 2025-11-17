// src/api/axiosConfig.ts
import axios, { type AxiosInstance } from "axios";

// Determine backend API base URL.
// Priority:
// 1️⃣ Use VITE_API_BASE (if provided during Docker build/run)
// 2️⃣ Fallback to current hostname → localhost inside your browser
const API_BASE =
  import.meta.env.VITE_API_BASE ||
  `${window.location.protocol}//localhost:8000`;

// Debug log — should always show "http://localhost:8000"
console.log("🌐 Using API base:", API_BASE);

const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Debug all errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[Axios Error]", error);
    return Promise.reject(error);
  }
);

export { api };
export default api;