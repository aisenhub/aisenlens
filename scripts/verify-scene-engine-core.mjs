import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
const command = process.platform === "win32" ? "corepack.cmd" : "corepack"
const steps = [
  ["scene-engine:configure", "配置 native Debug 测试构建"],
  ["scene-engine:build", "构建 native 引擎"],
  ["scene-engine:test", "运行 native CTest"],
  ["scene-engine:configure:wasm", "配置 baseline WASM"],
  ["scene-engine:build:wasm", "构建 baseline WASM"],
  ["scene-engine:configure:wasm:simd", "配置 SIMD WASM"],
  ["scene-engine:build:wasm:simd", "构建 SIMD WASM"],
  ["scene-engine:typecheck", "检查 Scene Engine TypeScript"],
  ["scene-engine:test:contract", "运行 ABI/Worker contract tests"],
  ["scene-engine:test:simd", "运行 SIMD parity tests"],
]

for (const [script, label] of steps) {
  console.log(`[scene-engine-verify] ${label}`)
  const result = spawnSync(command, ["pnpm", script], { cwd: root, stdio: "inherit", shell: process.platform === "win32" })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log("[scene-engine-verify] core matrix passed")
