// The generated Emscripten module is intentionally kept out of the public package entry.
// This file is a dev/browser smoke only; production URL packaging is handled by Phase 8.5.
const earlyMessages: MessageEvent[] = []
const earlyMessageListener = (event: MessageEvent) => earlyMessages.push(event)
self.addEventListener("message", earlyMessageListener)
const { createWasmRuntime } = await import("../../../packages/scene-engine/src/worker/wasmRuntime")
const { installSceneEngineWorker } = await import("../../../packages/scene-engine/src/worker/scene-engine.worker")
// @ts-expect-error generated Emscripten JS has no checked declaration file
const wasmFactoryModule = await import("../../../packages/scene-engine/dist/wasm/scene-engine.js")
const wasmFactory = wasmFactoryModule.default
let modulePromise: Promise<any> | undefined

function moduleInstance() {
  return (modulePromise ??= fetch("/@fs/E:/Projects/Aisenlens/packages/scene-engine/dist/wasm/scene-engine.wasm")
    .then((response) => {
      if (!response.ok) throw new Error(`WASM fetch failed: ${response.status}`)
      return response.arrayBuffer()
    })
    .then(async (wasmBinary) => {
      await WebAssembly.compile(wasmBinary)
      return wasmFactory({
      instantiateWasm(imports: WebAssembly.Imports, receiveInstance: (instance: WebAssembly.Instance) => void) {
        void WebAssembly.instantiate(wasmBinary, imports).then((result) => receiveInstance(result instanceof WebAssembly.Instance ? result : result.instance))
        return {}
      },
      })
    })
    )
}

function frame(value: number, timestampUs: number, presentationIndex: number) {
  return {
    pixelFormat: 2,
    bitDepth: 8,
    fullRange: true,
    codedWidth: 2,
    codedHeight: 2,
    visibleX: 0,
    visibleY: 0,
    visibleWidth: 2,
    visibleHeight: 2,
    matrix: 2,
    primaries: 2,
    transfer: 2,
    presentationIndex,
    timestampUs,
    durationUs: 1_000,
    planes: [{ data: new Uint8Array([value, value, value, 255, value, value, value, 255, value, value, value, 255, value, value, value, 255]), strideBytes: 8, sizeBytes: 16 }],
  }
}

const controller = installSceneEngineWorker(self, {
  initialize: async () => {
    await moduleInstance()
    return { backend: "wasm-baseline", version: "wasm-smoke" }
  },
  createRuntime: async (config) => createWasmRuntime(moduleInstance, config),
  createFrameSource: () => ({
    durationUs: 2_000,
    codedWidth: 2,
    codedHeight: 2,
    async *frames() {
      yield frame(0, 0, 0)
      yield frame(255, 1_000, 1)
    },
    dispose() {},
  }),
  progressIntervalMs: 0,
})
self.removeEventListener("message", earlyMessageListener)
for (const event of earlyMessages) controller.handle(event.data)
