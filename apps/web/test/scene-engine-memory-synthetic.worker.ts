const earlyMessages: MessageEvent[] = []
const earlyMessageListener = (event: MessageEvent) => earlyMessages.push(event)
self.addEventListener("message", earlyMessageListener)

const { createWasmRuntime } = await import("../../../packages/scene-engine/src/worker/wasmRuntime")
// @ts-expect-error generated Emscripten JS has no checked declaration file
const wasmFactory = (await import("../../../packages/scene-engine/dist/wasm/scene-engine.js")).default

const config = {
  hardCut: { kind: "content", threshold: 2700, weights: { hue: 3333, saturation: 3333, luma: 3334 } },
  fade: null,
  minimumSceneDurationUs: 600_000,
  analysis: { maxWidth: 96, temporalSampling: { kind: "every-frame" } },
  diagnostics: "off",
} as const

const modulePromise = fetch("/@fs/E:/Projects/Aisenlens/packages/scene-engine/dist/wasm/scene-engine.wasm")
  .then(async (response) => {
    if (!response.ok) throw new Error(`WASM fetch failed: ${response.status}`)
    return response.arrayBuffer()
  })
  .then(async (binary) => {
    await WebAssembly.compile(binary)
    return wasmFactory({
      instantiateWasm(imports: WebAssembly.Imports, receiveInstance: (instance: WebAssembly.Instance) => void) {
        void WebAssembly.instantiate(binary, imports).then((result) => receiveInstance(result instanceof WebAssembly.Instance ? result : result.instance))
        return {}
      },
    })
  })

async function run() {
  try {
    const module = await modulePromise
    const runtime = await createWasmRuntime(async () => module, config)
    let reserveCount = 0
    const target = runtime.reserveFrame(96, 54, 2)
    reserveCount += 1
    const plane = new Uint8Array(96 * 54 * 4)
    const initialWasmBytes = module.HEAPU8?.buffer.byteLength ?? 0
    let maxWasmBytes = initialWasmBytes
    const frames = 200
    for (let index = 0; index < frames; index += 1) {
      plane[0] = index & 0xff
      runtime.processFrame({
        pixelFormat: 2,
        bitDepth: 8,
        fullRange: true,
        codedWidth: 96,
        codedHeight: 54,
        visibleX: 0,
        visibleY: 0,
        visibleWidth: 96,
        visibleHeight: 54,
        matrix: 2,
        primaries: 2,
        transfer: 2,
        presentationIndex: index,
        timestampUs: index * 40_000,
        durationUs: 40_000,
        planes: [{ data: plane, strideBytes: 96 * 4, sizeBytes: plane.byteLength }],
      })
      maxWasmBytes = Math.max(maxWasmBytes, module.HEAPU8?.buffer.byteLength ?? 0)
    }
    runtime.dispose()
    self.postMessage({ ok: true, result: { frames, reserveCount, initialWasmBytes, maxWasmBytes } })
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}

self.removeEventListener("message", earlyMessageListener)
for (const event of earlyMessages) void run()
