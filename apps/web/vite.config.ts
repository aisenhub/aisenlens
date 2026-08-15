import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";

  return {
    base: "/",
    build: {
      sourcemap: isProduction ? false : "inline",
      minify: isProduction,
      cssMinify: isProduction,
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
