import { createMediaFrameSource } from "@aisenlens/scene-engine/worker/mediaFrameSource.js"
import { createWasmBackendSelector } from "@aisenlens/scene-engine/worker/featureProbe.js"
import { createWasmBackendLoader } from "@aisenlens/scene-engine/worker/wasmBackendLoader.js"
import { createWasmRuntime } from "@aisenlens/scene-engine/worker/wasmRuntime.js"
import { installSceneEngineWorker } from "@aisenlens/scene-engine/worker/scene-engine.worker.js"
// @ts-expect-error generated Emscripten module has no checked declaration file
import baselineFactory from "@aisenlens/scene-engine-wasm-module"
// @ts-expect-error generated Emscripten module has no checked declaration file
import simdFactory from "@aisenlens/scene-engine-wasm-simd-module"
import baselineWasmUrl from "../../../../../../packages/scene-engine/dist/wasm/scene-engine.wasm?url"
import simdWasmUrl from "../../../../../../packages/scene-engine/dist/wasm-simd/scene-engine-simd.wasm?url"

// Queue messages sent while Vite is loading the worker's module graph.
const earlyMessages: MessageEvent[] = []
const earlyMessageListener = (event: MessageEvent) => earlyMessages.push(event)
self.addEventListener("message", earlyMessageListener)

// Select the SIMD backend when supported; the loader still falls back to
// baseline before initialization completes if the SIMD resource cannot load.
const selectBackend = createWasmBackendSelector()
const backendLoader = createWasmBackendLoader({
  selectBackend,
  loadModule: async (backend) => {
    const wasmUrl = backend === "wasm-simd" ? simdWasmUrl : baselineWasmUrl
    const wasmFactory = backend === "wasm-simd" ? simdFactory : baselineFactory
    const wasmBinary = await fetch(wasmUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`WASM fetch failed: ${response.status}`)
        return response.arrayBuffer()
      })
    await WebAssembly.compile(wasmBinary)
    return wasmFactory({
      instantiateWasm(imports: WebAssembly.Imports, receiveInstance: (instance: WebAssembly.Instance) => void) {
        void WebAssembly.instantiate(wasmBinary, imports).then((result) => receiveInstance(result instanceof WebAssembly.Instance ? result : result.instance))
        return {}
      },
    })
  },
})

const controller = installSceneEngineWorker(self, {
  initialize: () => backendLoader.initialize(),
  createRuntime: async (config) => createWasmRuntime(() => backendLoader.module(), config),
  createFrameSource: async (message) => createMediaFrameSource(message.source, message.checkpoint),
})

self.removeEventListener("message", earlyMessageListener)
for (const event of earlyMessages) controller.handle(event.data)
