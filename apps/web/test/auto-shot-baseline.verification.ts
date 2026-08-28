import { runAutoShotDetection } from "../src/features/auto-shot/services/autoShotService"
import type { AutoShotRunRecord } from "../src/features/project/types"

const FIXTURE_PATH = "/test/fixtures/auto-shot/synthetic.webm"
const FIXTURE_NAME = "synthetic.webm"
const FIXTURE_LAST_MODIFIED = 1_787_807_006_000
const FIXTURE_SHA256 = "09FD690F4ACE87A88B05CE234E09F87F2B4B23CDF3A01925C0A4FC1449F8A6C0"
const FRAME_RATE = 30
const SENSITIVITY = 55
const MINIMUM_SHOT_SECONDS = 0.4

function loadVideoMetadata(sourceUrl: string): Promise<HTMLVideoElement> {
  const video = document.createElement("video")
  video.preload = "metadata"
  video.muted = true
  video.src = sourceUrl
  return new Promise((resolve, reject) => {
    video.addEventListener("loadedmetadata", () => resolve(video), { once: true })
    video.addEventListener("error", () => reject(new Error("无法读取自动分镜基线素材元数据。")), { once: true })
  })
}

function readMemory(): number | null {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
  return typeof memory?.usedJSHeapSize === "number" ? memory.usedJSHeapSize : null
}

export async function runAutoShotBaselineVerification() {
  const response = await fetch(FIXTURE_PATH)
  if (!response.ok) throw new Error(`无法读取基线素材：${response.status}`)
  const blob = await response.blob()
  const video = await loadVideoMetadata(URL.createObjectURL(blob))
  const longTasks: number[] = []
  const longTaskObserver = "PerformanceObserver" in window
    ? new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) longTasks.push(entry.duration)
    })
    : null
  longTaskObserver?.observe({ type: "longtask", buffered: true })
  const updates: AutoShotRunRecord[] = []
  const startedAt = performance.now()
  const memorySamples = [readMemory()].filter((value): value is number => value !== null)
  const run = await runAutoShotDetection({
    projectId: `baseline-${crypto.randomUUID()}`,
    sourceUrl: URL.createObjectURL(blob),
    mediaFingerprint: {
      name: FIXTURE_NAME,
      size: blob.size,
      lastModified: FIXTURE_LAST_MODIFIED,
      mimeType: blob.type || "video/quicktime",
    },
    durationSeconds: video.duration,
    frameRate: FRAME_RATE,
    sensitivity: SENSITIVITY,
    minimumShotSeconds: MINIMUM_SHOT_SECONDS,
    resumeRun: null,
    signal: new AbortController().signal,
    onUpdate: (nextRun) => {
      updates.push(nextRun)
      const memory = readMemory()
      if (memory !== null) memorySamples.push(memory)
    },
  })
  const endedAt = performance.now()
  longTaskObserver?.disconnect()
  URL.revokeObjectURL(video.src)
  return {
    fixture: {
      path: FIXTURE_PATH,
      name: FIXTURE_NAME,
      size: blob.size,
      sha256: FIXTURE_SHA256,
      durationSeconds: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      frameRate: FRAME_RATE,
      sensitivity: SENSITIVITY,
      minimumShotSeconds: MINIMUM_SHOT_SECONDS,
    },
    run: {
      status: run.status,
      durationFrames: run.durationFrames,
      cursorFrame: run.cursorFrame,
      cuts: run.cuts,
      errorMessage: run.errorMessage,
    },
    metrics: {
      totalMilliseconds: endedAt - startedAt,
      updateCount: updates.length,
      longTaskCount: longTasks.length,
      longestLongTaskMilliseconds: longTasks.length ? Math.max(...longTasks) : 0,
      peakJsHeapBytes: memorySamples.length ? Math.max(...memorySamples) : null,
      seekAndCanvasProcessingMilliseconds: null,
    },
    environment: {
      userAgent: navigator.userAgent,
      crossOriginIsolated: window.crossOriginIsolated,
      performanceMemoryAvailable: memorySamples.length > 0,
    },
  }
}
