import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../client/src"),
      "@shared": path.resolve(__dirname, "../../shared"),
      "@cbt/shared-types": path.resolve(__dirname, "../../packages/shared-types/src"),
      "@cbt/shared-ui": path.resolve(__dirname, "../../packages/shared-ui/src"),
      "@cbt/shared-api-client": path.resolve(__dirname, "../../packages/shared-api-client/src"),
      "@cbt/shared-realtime": path.resolve(__dirname, "../../packages/shared-realtime/src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("firebase")) {
              return "vendor-firebase";
            }
            if (id.includes("lucide-react") || id.includes("framer-motion") || id.includes("@radix-ui")) {
              return "vendor-ui";
            }
            if (id.includes("@tanstack") || id.includes("wouter")) {
              return "vendor-core";
            }
          }
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5001,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
