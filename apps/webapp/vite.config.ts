import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";
  const includeSceneEngineWorker = process.env.AISENLENS_INCLUDE_SCENE_ENGINE_WORKER === "1";
  const sceneEngineWorkerEntry = path.resolve(__dirname, "./src/features/auto-shot/workers/scene-engine.worker.ts");
  const base = process.env.AISENLENS_SCENE_ENGINE_BASE || "/";

  return {
    base,
    build: {
      ...(process.env.AISENLENS_SCENE_ENGINE_OUT_DIR ? { outDir: process.env.AISENLENS_SCENE_ENGINE_OUT_DIR } : {}),
      sourcemap: isProduction ? false : "inline",
      minify: isProduction,
      cssMinify: isProduction,
      target: "es2020",
      reportCompressedSize: false,
      rollupOptions: {
        ...(includeSceneEngineWorker ? { input: { app: path.resolve(__dirname, "./index.html"), sceneEngineWorker: sceneEngineWorkerEntry } } : {}),
        output: {
          assetFileNames: "assets/[hash][extname]",
          chunkFileNames: "assets/[hash].js",
          entryFileNames: "assets/[hash].js",
          manualChunks(id) {
            if (id.includes("/packages/scene-engine/")) return "scene-engine"
            if (id.includes("/features/auto-shot/")) return "auto-shot"
            if (id.includes("/features/scene-calibration/")) return "calibration"
            if (id.includes("/features/export/")) return "export"
            if (id.includes("/features/media/")) return "media"
            return undefined
          },
        },
      },
    },
    worker: {
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
        "@aisenlens/scene-engine": path.resolve(__dirname, "../../packages/scene-engine/src"),
        "@aisenlens/scene-engine-wasm-module": path.resolve(__dirname, "../../packages/scene-engine/dist/wasm/scene-engine.js"),
        "@aisenlens/scene-engine-wasm": path.resolve(__dirname, "../../packages/scene-engine/dist/wasm/scene-engine.wasm"),
        "@aisenlens/scene-engine-wasm-simd-module": path.resolve(__dirname, "../../packages/scene-engine/dist/wasm-simd/scene-engine-simd.js"),
        "@aisenlens/scene-engine-wasm-simd": path.resolve(__dirname, "../../packages/scene-engine/dist/wasm-simd/scene-engine-simd.wasm"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: parseInt(process.env.PORT || "8443", 10),
      strictPort: true,
    },
    preview: {
      host: "0.0.0.0",
      port: parseInt(process.env.PORT || "8443", 10),
    },
  };
});
