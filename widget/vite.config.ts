import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
  },
  build: {
    lib: {
      entry: "src/main.tsx",
      name: "ConvexoWidget",
      fileName: "widget",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
}));
