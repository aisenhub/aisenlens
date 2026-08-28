const config = {
  hardCut: { kind: "content", threshold: 2700, weights: { hue: 3333, saturation: 3333, luma: 3334 } },
  fade: null,
  minimumSceneDurationUs: 600_000,
  analysis: { maxWidth: 96, temporalSampling: { kind: "every-frame" } },
  diagnostics: "off",
} as const

type Mode = "pause" | "cancel" | "error"

async function run(mode: Mode) {
  const source = mode === "error" ? new Blob(["not a media file"]) : await fetch("/test/test.mov").then((response) => response.blob())
  return await new Promise<{ mode: Mode; status: string; messages: unknown[] }>((resolve, reject) => {
    const worker = new Worker("/test/scene-engine-media-module.worker.ts", { type: "module" })
    const messages: unknown[] = []
    const jobId = `media-lifecycle-${mode}`
    let resumed = false
    const finish = (status: string) => { worker.terminate(); resolve({ mode, status, messages }) }
    const timer = setTimeout(() => finish("timeout"), 120_000)
    worker.onmessage = (event) => {
      const message = event.data
      messages.push(message)
      if (message.type === "READY") {
        worker.postMessage({ type: "START", jobId, source, mediaFingerprint: `sha256:${mode}`, config })
      } else if (message.type === "STARTED" && mode === "cancel") {
        worker.postMessage({ type: "CANCEL", jobId })
      } else if (message.type === "PROGRESS" && mode === "pause" && message.progress.decodedFrames >= 2) {
        worker.postMessage({ type: "PAUSE", jobId })
      } else if (message.type === "CHECKPOINT" && mode === "pause" && !resumed) {
        resumed = true
        worker.postMessage({ type: "START", jobId: `${jobId}-resume`, source, mediaFingerprint: `sha256:${mode}`, config, checkpoint: message.checkpoint })
      } else if (["CHECKPOINT", "CANCELLED", "ERROR", "COMPLETED"].includes(message.type)) {
        clearTimeout(timer)
        finish(message.type === "COMPLETED" && resumed ? "RESUMED_COMPLETED" : message.type)
      }
    }
    worker.onerror = (event) => { clearTimeout(timer); worker.terminate(); reject(new Error(event.message)) }
    worker.postMessage({ type: "INIT" })
  })
}

export async function runAutoShotMediaLifecycleVerification() {
  return { pause: await run("pause"), cancel: await run("cancel"), error: await run("error") }
}
