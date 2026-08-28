type Backend = "baseline" | "simd"

const CONFIG = {
  hardCut: { kind: "content" as const, threshold: 2700, weights: { hue: 3333, saturation: 3333, luma: 3334 } },
  fade: null,
  minimumSceneDurationUs: 600_000,
  analysis: { maxWidth: 96, temporalSampling: { kind: "every-frame" as const } },
  diagnostics: "off" as const,
}

function runBackend(backend: Backend, source: Blob) {
  return new Promise<any>((resolve, reject) => {
    const worker = new Worker(`/test/scene-engine-media-backend.worker.ts?backend=${backend}`, { type: "module" })
    const messages: any[] = []
    const timer = setTimeout(() => { worker.terminate(); reject(new Error(`${backend} backend parity smoke timeout`)) }, 120_000)
    worker.onerror = (event) => { clearTimeout(timer); worker.terminate(); reject(new Error(event.message)) }
    worker.onmessage = (event) => {
      messages.push(event.data)
      if (event.data.type === "READY") {
        worker.postMessage({ type: "START", jobId: `backend-parity-${backend}`, source, mediaFingerprint: `sha256:backend-parity-${backend}`, config: CONFIG })
      }
      if (event.data.type === "COMPLETED" || event.data.type === "ERROR") {
        clearTimeout(timer)
        worker.terminate()
        resolve({ backend, messages, terminal: event.data })
      }
    }
    worker.postMessage({ type: "INIT" })
  })
}

export async function runAutoShotBackendParityVerification() {
  const response = await fetch("/test/test.mov")
  if (!response.ok) throw new Error(`无法读取 backend parity 素材：${response.status}`)
  const source = await response.blob()
  const baseline = await runBackend("baseline", source)
  const simd = await runBackend("simd", source)
  if (baseline.terminal.type !== "COMPLETED" || simd.terminal.type !== "COMPLETED") throw new Error(JSON.stringify({ baseline, simd }))
  const baselineResult = baseline.terminal.result
  const simdResult = simd.terminal.result
  return {
    baseline: { backend: baseline.terminal.type === "COMPLETED" ? baseline.messages.find((message: any) => message.type === "READY")?.backend : null, result: baselineResult },
    simd: { backend: simd.messages.find((message: any) => message.type === "READY")?.backend, result: simdResult },
    compared: {
      decodedFramesEqual: baselineResult.media.decodedFrames === simdResult.media.decodedFrames,
      boundariesEqual: JSON.stringify(baselineResult.boundaries) === JSON.stringify(simdResult.boundaries),
      durationEqual: baselineResult.media.durationUs === simdResult.media.durationUs,
    },
  }
}
