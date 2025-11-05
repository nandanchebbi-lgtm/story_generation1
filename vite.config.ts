import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // ✅ Enables "@/..." imports
    },
  },
  server: {
    port: 5173, // optional: customize your dev port
    open: true, // optional: auto-open browser
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000", // ✅ Your FastAPI backend
        changeOrigin: true,
        secure: false,
      },
      "/static": {
        target: "http://127.0.0.1:8000", // ✅ for your static files (Mindlink images, etc.)
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});