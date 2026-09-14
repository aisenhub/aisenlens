import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ mode }) => ({
  base: "/",
  build: {
    sourcemap: mode === "production" ? false : "inline",
    minify: mode === "production",
    cssMinify: mode === "production",
    target: "es2020",
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        assetFileNames: "assets/[hash][extname]",
        chunkFileNames: "assets/[hash].js",
        entryFileNames: "assets/[hash].js",
      },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 8442,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 8442,
  },
}));
