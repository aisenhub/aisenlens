import { build } from "../apps/web/node_modules/vite/dist/node/index.js"
import { readFile, readdir, rm, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

const outputDirectory = resolve("test-results", "scene-engine-web-build")
await rm(outputDirectory, { recursive: true, force: true })
process.env.AISENLENS_INCLUDE_SCENE_ENGINE_WORKER = "1"
process.env.AISENLENS_SCENE_ENGINE_OUT_DIR = outputDirectory
process.env.AISENLENS_SCENE_ENGINE_BASE = "/aisenlens/"
await build({
  root: resolve("apps/web"),
  configFile: resolve("apps/web/vite.config.ts"),
  mode: "production",
  build: { outDir: outputDirectory, emptyOutDir: true },
})

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? files(resolve(directory, entry.name)) : [resolve(directory, entry.name)]))
  return nested.flat()
}

const outputFiles = await files(outputDirectory)
const wasmFiles = outputFiles.filter((file) => file.endsWith(".wasm"))
const workerFiles = []
for (const file of outputFiles.filter((candidate) => candidate.endsWith(".js"))) {
  const content = await readFile(file, "utf8")
  if (content.includes("wasm-media") || content.includes("instantiateWasm")) workerFiles.push(file)
}
if (wasmFiles.length === 0) throw new Error("生产构建没有输出 scene-engine WASM 资源")
if (workerFiles.length === 0) throw new Error("生产构建没有输出 scene-engine Worker 入口")
const manifest = {
  base: process.env.AISENLENS_SCENE_ENGINE_BASE,
  outputDirectory,
  wasmFiles: wasmFiles.map((file) => file.slice(outputDirectory.length + 1).replaceAll("\\", "/")),
  workerFiles: workerFiles.map((file) => file.slice(outputDirectory.length + 1).replaceAll("\\", "/")),
}
await writeFile(resolve(outputDirectory, "scene-engine-manifest.json"), JSON.stringify(manifest, null, 2), "utf8")
console.log(JSON.stringify(manifest, null, 2))
