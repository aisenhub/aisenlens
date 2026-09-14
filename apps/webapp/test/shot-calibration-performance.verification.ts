import { applyCalibrationCommand } from "../src/features/shot-calibration/services/calibrationCommandService"
import { createCalibrationDraft, deriveCalibrationSegments, validateCalibrationDraft } from "../src/features/shot-calibration/services/calibrationDraftService"
import type { CalibrationBoundary, CalibrationDraft } from "../src/features/shot-calibration/types"

interface PerformanceMemory {
  usedJSHeapSize: number
}

function makeDraft(boundaryCount: number): CalibrationDraft {
  const totalFrames = boundaryCount * 10 + 1
  const frameRate = 30
  const base = createCalibrationDraft({
    projectId: `performance:${boundaryCount}`,
    mediaIdentity: {
      identitySchema: "aisenlens-auto-shot-media-identity",
      schemaVersion: 1,
      contentDigestStrategy: "sha256-file-v1",
      contentDigest: "c".repeat(64),
      size: 1,
      codec: "vp9",
      codedWidth: 640,
      codedHeight: 360,
      displayWidth: 640,
      displayHeight: 360,
      rotation: 0,
      durationUs: Math.round(totalFrames * 1_000_000 / frameRate),
      mediaIdentityDigest: "d".repeat(64),
    },
    mediaSource: null,
    frameRate,
    totalFrames,
    baseProjectUpdatedAt: new Date(0).toISOString(),
    task: null,
    shots: [],
  })
  const boundaries: CalibrationBoundary[] = Array.from({ length: boundaryCount }, (_, index) => ({
    id: `performance-boundary:${index}`,
    frame: (index + 1) * 10,
    source: "manual",
    candidateId: null,
    originalFrame: null,
    wasManuallyAdjusted: false,
    transitionRange: null,
  }))
  return { ...base, boundaries, segments: deriveCalibrationSegments(totalFrames, boundaries) }
}

function now() {
  return globalThis.performance.now()
}

function heapUsed() {
  return (globalThis.performance as Performance & { memory?: PerformanceMemory }).memory?.usedJSHeapSize ?? null
}

export async function runShotCalibrationPerformanceVerification() {
  const matrix: Array<{ boundaryCount: number; deriveMs: number; validateMs: number; segmentCount: number; heapDeltaBytes: number | null }> = []
  for (const boundaryCount of [100, 1_000, 3_000]) {
    const beforeHeap = heapUsed()
    const startDerive = now()
    const draft = makeDraft(boundaryCount)
    const deriveMs = now() - startDerive
    const startValidate = now()
    validateCalibrationDraft(draft)
    const validateMs = now() - startValidate
    const afterHeap = heapUsed()
    matrix.push({ boundaryCount, deriveMs: Number(deriveMs.toFixed(2)), validateMs: Number(validateMs.toFixed(2)), segmentCount: draft.segments.length, heapDeltaBytes: beforeHeap === null || afterHeap === null ? null : afterHeap - beforeHeap })
  }

  const commandDraft = makeDraft(1_000)
  const startCommands = now()
  let current = commandDraft
  for (let index = 0; index < 20; index += 1) {
    const frame = index * 10 + 5
    current = applyCalibrationCommand(current, { type: "moveBoundary", boundaryId: `performance-boundary:${index}`, frame, expectedRevision: current.revision }).draft
  }
  const commandMs = now() - startCommands
  const result = {
    environment: {
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
      performanceMemoryAvailable: heapUsed() !== null,
    },
    matrix,
    commandPressure: { boundaryCount: 1_000, commandCount: 20, elapsedMs: Number(commandMs.toFixed(2)), finalRevision: current.revision },
  }
  if (matrix.some((item) => item.segmentCount !== item.boundaryCount + 1) || current.revision !== 20) throw new Error(`校准压力矩阵断言失败: ${JSON.stringify(result)}`)
  return result
}
