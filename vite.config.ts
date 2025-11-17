import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables for the current mode
  const env = loadEnv(mode, process.cwd(), "");

  // Use VITE_API_BASE if defined, fallback to localhost for dev
  const API_BASE = env.VITE_API_BASE || "http://127.0.0.1:8000";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"), // Enables "@/..." imports
      },
    },
    server: {
      port: 5173,
      open: true,
      proxy: {
        "/api": {
          target: API_BASE,
          changeOrigin: true,
          secure: false,
        },
        "/static": {
          target: API_BASE,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
    define: {
      // Make the API base available in TypeScript
      __VITE_API_BASE__: JSON.stringify(process.env.VITE_API_BASE),
    },
  };
});