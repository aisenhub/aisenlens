import { performance } from "node:perf_hooks"
import { existsSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { createWasmRuntime } from "../packages/scene-engine/build/ts/src/worker/wasmRuntime.js"
import { DEFAULT_SCENE_DETECTION_CONFIG } from "../packages/scene-engine/build/ts/src/api/config.js"
import baselineFactory from "../packages/scene-engine/dist/wasm/scene-engine.js"
import simdFactory from "../packages/scene-engine/dist/wasm-simd/scene-engine-simd.js"

const repositoryDirectory = resolve(import.meta.dirname, "..")
const packageDirectory = resolve(repositoryDirectory, "packages/scene-engine")
const width = 96
const height = 54
const strideBytes = width * 4
const frameCount = 500
const warmupFrames = 100
const rounds = 3

if (!existsSync(resolve(packageDirectory, "dist/wasm/scene-engine.wasm")) || !existsSync(resolve(packageDirectory, "dist/wasm-simd/scene-engine-simd.wasm"))) {
  throw new Error("缺少 baseline/SIMD WASM 产物，请先运行 scene-engine:build:wasm 和 scene-engine:build:wasm:simd。")
}

const frames = Array.from({ length: frameCount }, (_, presentationIndex) => ({
  pixelFormat: 2,
  bitDepth: 8,
  fullRange: true,
  codedWidth: width,
  codedHeight: height,
  visibleX: 0,
  visibleY: 0,
  visibleWidth: width,
  visibleHeight: height,
  matrix: 2,
  primaries: 2,
  transfer: 2,
  presentationIndex,
  timestampUs: presentationIndex * 40_000,
  durationUs: 40_000,
  planes: [{ data: new Uint8Array(strideBytes * height).fill(presentationIndex % 2 ? 255 : 0), strideBytes, sizeBytes: strideBytes * height }],
}))

async function run(factory, directory) {
  const runtime = await createWasmRuntime(() => factory({ locateFile: (name) => resolve(packageDirectory, directory, name) }), DEFAULT_SCENE_DETECTION_CONFIG)
  runtime.reserveFrame(width, height, 2)
  for (let index = 0; index < warmupFrames; index += 1) runtime.processFrame(frames[index])
  const startedAt = performance.now()
  for (let index = warmupFrames; index < frameCount; index += 1) runtime.processFrame(frames[index])
  const elapsedMilliseconds = performance.now() - startedAt
  runtime.dispose()
  return elapsedMilliseconds
}

const baselineRounds = []
const simdRounds = []
for (let round = 0; round < rounds; round += 1) {
  baselineRounds.push(await run(baselineFactory, "dist/wasm"))
  simdRounds.push(await run(simdFactory, "dist/wasm-simd"))
}
const median = (values) => [...values].sort((left, right) => left - right)[Math.floor(values.length / 2)]
const baselineMilliseconds = median(baselineRounds)
const simdMilliseconds = median(simdRounds)
const report = {
  generatedAt: new Date().toISOString(),
  frames: frameCount - warmupFrames,
  warmupFrames,
  width,
  height,
  rounds,
  baselineRoundsMilliseconds: baselineRounds,
  simdRoundsMilliseconds: simdRounds,
  baselineMilliseconds,
  simdMilliseconds,
  speedup: baselineMilliseconds / simdMilliseconds,
  note: "Microbenchmark covers shared frame-metric processing with previous-frame deltas; it is a regression signal, not a product SLA.",
}
await mkdir(resolve(repositoryDirectory, "test-results"), { recursive: true })
await writeFile(resolve(repositoryDirectory, "test-results/scene-engine-backend-benchmark.json"), JSON.stringify(report, null, 2), "utf8")
console.log(JSON.stringify(report, null, 2))
