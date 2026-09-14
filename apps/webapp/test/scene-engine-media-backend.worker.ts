const earlyMessages: MessageEvent[] = []
const earlyMessageListener = (event: MessageEvent) => earlyMessages.push(event)
self.addEventListener("message", earlyMessageListener)

const { createMediaFrameSource } = await import("../../../packages/scene-engine/src/worker/mediaFrameSource")
const { createWasmRuntime } = await import("../../../packages/scene-engine/src/worker/wasmRuntime")
const { installSceneEngineWorker } = await import("../../../packages/scene-engine/src/worker/scene-engine.worker")

const backend = new URL(self.location.href).searchParams.get("backend") === "simd" ? "wasm-simd" : "wasm-baseline"
const wasmDirectory = backend === "wasm-simd" ? "wasm-simd" : "wasm"
const wasmFile = backend === "wasm-simd" ? "scene-engine-simd.wasm" : "scene-engine.wasm"
// @ts-expect-error generated Emscripten JS has no checked declaration file
const wasmFactory = (await import(`../../../packages/scene-engine/dist/${wasmDirectory}/${backend === "wasm-simd" ? "scene-engine-simd" : "scene-engine"}.js`)).default
let modulePromise: Promise<any> | undefined

function moduleInstance() {
  return (modulePromise ??= fetch(`/@fs/E:/Projects/Aisenlens/packages/scene-engine/dist/${wasmDirectory}/${wasmFile}`)
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
    }))
}

const controller = installSceneEngineWorker(self, {
  initialize: async () => {
    await moduleInstance()
    return { backend, version: backend === "wasm-simd" ? "wasm-media-simd" : "wasm-media" }
  },
  createRuntime: async (config) => createWasmRuntime(moduleInstance, config),
  createFrameSource: async (message) => {
    const source = await createMediaFrameSource(message.source, message.checkpoint)
    return {
      durationUs: source.durationUs,
      codedWidth: source.codedWidth,
      codedHeight: source.codedHeight,
      async *frames(target) {
        for await (const frame of source.frames(target)) {
          yield frame
        }
      },
      dispose: () => source.dispose(),
    }
  },
  progressIntervalMs: 0,
})
self.removeEventListener("message", earlyMessageListener)
for (const event of earlyMessages) controller.handle(event.data)
