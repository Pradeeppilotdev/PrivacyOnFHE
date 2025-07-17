import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: "window",
    "process.env": {},
    Buffer: ["buffer", "Buffer"],
  },
  optimizeDeps: {
    include: ["buffer"],
  },
  server: {
    port: 3000,
    host: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    allowedHosts: ["5ae8c6199f85.ngrok-free.app"],
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
