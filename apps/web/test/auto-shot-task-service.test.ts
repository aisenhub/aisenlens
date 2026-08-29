import assert from "node:assert/strict"
import test from "node:test"
import { createAutoShotTaskService } from "../src/features/auto-shot/autoShotTaskService.ts"

const fingerprint = {
  name: "clip.mov",
  size: 10,
  lastModified: 1,
  mimeType: "video/quicktime",
}
const mediaIdentity = {
  identitySchema: "aisenlens-auto-shot-media-identity" as const,
  schemaVersion: 1 as const,
  contentDigestStrategy: "sha256-file-v1" as const,
  contentDigest: "a".repeat(64),
  size: 10,
  codec: "avc1.640028",
  codedWidth: 1920,
  codedHeight: 1080,
  displayWidth: 1920,
  displayHeight: 1080,
  rotation: 0 as const,
  durationUs: 2_000_000,
  mediaIdentityDigest: "b".repeat(64),
}
const config = {
  hardCut: {
    kind: "content" as const,
    threshold: 2700,
    weights: { hue: 3333, saturation: 3333, luma: 3334 },
  },
  fade: null,
  minimumSceneDurationUs: 1_000_000,
  analysis: {
    maxWidth: 96,
    temporalSampling: { kind: "every-frame" as const },
  },
  diagnostics: "off" as const,
}
const resolved = {
  schemaVersion: 1 as const,
  settings: {
    schemaVersion: 1 as const,
    detail: "balanced" as const,
    transitions: "hard-cuts" as const,
    minimumSceneDuration: { mode: "custom" as const, seconds: 1 },
    overrides: {},
    preset: { id: "general" as const, version: 1, catalog: "research" as const },
  },
  engineConfig: config,
  canonicalConfig: JSON.stringify(["aisenlens-scene-config", 1, ["content", 2700, 3333, 3333, 3334], null, 1_000_000, [96, ["every-frame"]], "off"]),
  configHash: "fnv1a64-v1:dabf02d3cce72112",
  summary: {
    presetId: "general" as const,
    presetName: "通用视频",
    catalog: "research" as const,
    catalogStatus: "uncalibrated" as const,
    detail: "balanced" as const,
    transitions: "hard-cuts" as const,
    minimumSceneDurationSeconds: 1,
    detector: "content" as const,
    analysisLabel: "逐帧 / 96 宽" as const,
    calibrationLabel: "待标定" as const,
  },
}

function fakeClient() {
  let progressObserver: ((progress: any) => void) | null = null
  let resolveCompletion: (outcome: any) => void
  const completion = new Promise<any>((resolve) => {
    resolveCompletion = resolve
  })
  const task = {
    jobId: "fake-job",
    completion,
    pause: async () => {},
    cancel: async () => {},
  }
  return {
    task,
    resolve: resolveCompletion,
    client: {
      start: (_request: any, observer: any) => {
        progressObserver = observer.onProgress
        return task
      },
      dispose: async () => {},
    },
    progress(progress: any) {
      progressObserver?.(progress)
    },
  }
}

function repository() {
  const records = new Map<string, any>()
  const calls: string[] = []
  return {
    calls,
    records,
    repository: {
      async getAutoShotTask(projectId: string) {
        return records.get(projectId) ?? null
      },
      async saveAutoShotTask(record: any) {
        records.set(record.projectId, record)
      },
      async deleteAutoShotTask(projectId: string) {
        calls.push(`delete:${projectId}`)
        records.delete(projectId)
      },
    },
  }
}

test("service persists progress and adapts completed engine result", async () => {
  const fake = fakeClient()
  const store = repository()
  const service = createAutoShotTaskService({
    createClient: () => fake.client as any,
    repository: store.repository as any,
    resolveConfig: (value) => value,
    createId: () => "task-1",
    now: () => "2026-08-28T00:00:00.000Z",
  })
  const handle = await service.start({
    projectId: "project-1",
    source: new Blob(),
    mediaIdentity,
    resolved,
    durationUs: 2_000_000,
    fpsNumerator: 30,
    fpsDenominator: 1,
  })
  fake.progress({
    processedUs: 400_000,
    durationUs: 2_000_000,
    decodedFrames: 12,
    newBoundaries: [],
    totalBoundaries: 0,
  })
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(store.records.get("project-1").progress.decodedFrames, 12)
  assert.equal(store.records.get("project-1").controlSnapshot.preset.id, "general")
  assert.equal(store.records.get("project-1").controlSnapshot.preset.catalog, "research")
  fake.resolve({
    status: "completed",
    result: {
      schemaVersion: 1,
      engineVersion: "wasm-media",
      configHash: "hash",
      media: {
        durationUs: 2_000_000,
        decodedFrames: 60,
        codedWidth: 96,
        codedHeight: 54,
      },
      boundaries: [],
      diagnostics: { backend: "wasm-baseline", elapsedMs: 1, peakWasmBytes: 0 },
    },
  })
  const completed = await handle.completion
  assert.equal(completed.status, "completed")
  assert.equal(completed.result?.configHash, "hash")
  assert.equal(completed.progress.decodedFrames, 60)
  assert.equal(completed.candidates.length, 1)
})

test("pause stores checkpoint, resume uses it, and cancel never stores one", async () => {
  const store = repository()
  const first = fakeClient()
  const service = createAutoShotTaskService({
    createClient: () => first.client as any,
    repository: store.repository as any,
    resolveConfig: (value) => value,
    createId: () => "task-paused",
    now: () => "2026-08-28T00:00:00.000Z",
  })
  const handle = await service.start({
    projectId: "project-2",
    source: new Blob(),
    mediaIdentity,
    resolved,
    durationUs: 2_000_000,
    fpsNumerator: 30,
    fpsDenominator: 1,
  })
  const checkpoint = {
    schemaVersion: 1,
    engineVersion: "wasm-media",
    configHash: "fnv1a64-v1:dabf02d3cce72112",
    mediaIdentityDigest: mediaIdentity.mediaIdentityDigest,
    resumeAfter: {
      timestampUs: 400_000,
      timestampOrdinal: 12,
      nextPresentationIndex: 13,
    },
    committedBoundaries: [],
    coreState: new ArrayBuffer(0),
  }
  first.resolve({ status: "paused", checkpoint })
  const paused = await handle.completion
  assert.equal(paused.status, "paused")
  assert.equal(paused.checkpoint, checkpoint)

  const resumed = fakeClient()
  const resumedService = createAutoShotTaskService({
    createClient: () => resumed.client as any,
    repository: store.repository as any,
    resolveConfig: (value) => value,
    createId: () => "task-resumed",
    now: () => "2026-08-28T00:00:00.000Z",
  })
  const resumedHandle = await resumedService.start({
    projectId: "project-2",
    source: new Blob(),
    mediaIdentity,
    resolved,
    durationUs: 2_000_000,
    fpsNumerator: 30,
    fpsDenominator: 1,
    resume: true,
  })
  resumed.resolve({ status: "cancelled" })
  const cancelled = await resumedHandle.completion
  assert.equal(cancelled.status, "cancelled")
  assert.equal(cancelled.checkpoint, null)
})

test("restart removes a previous task and failed outcome is terminal", async () => {
  const store = repository()
  const fake = fakeClient()
  store.records.set("project-3", {
    id: "old",
    projectId: "project-3",
    status: "completed",
  })
  const service = createAutoShotTaskService({
    createClient: () => fake.client as any,
    repository: store.repository as any,
    resolveConfig: (value) => value,
    createId: () => "task-restart",
    now: () => "2026-08-28T00:00:00.000Z",
  })
  const handle = await service.start({
    projectId: "project-3",
    source: new Blob(),
    mediaIdentity,
    resolved,
    durationUs: 1_000_000,
    fpsNumerator: 30,
    fpsDenominator: 1,
    restart: true,
  })
  fake.resolve({
    status: "failed",
    error: { code: "DECODE_FAILED", message: "bad media" },
  })
  const failed = await handle.completion
  assert.equal(store.calls[0], "delete:project-3")
  assert.equal(failed.status, "failed")
  assert.equal(failed.error?.code, "DECODE_FAILED")
})

test("resume invalidates a checkpoint when media or config no longer matches", async () => {
  const store = repository()
  store.records.set("project-4", {
    id: "paused-old",
    projectId: "project-4",
    mediaIdentity,
    config,
    status: "paused",
    progress: {
      processedUs: 1,
      durationUs: 2,
      decodedFrames: 1,
      candidateCount: 0,
    },
    candidates: [],
    checkpoint: {
      schemaVersion: 1,
      engineVersion: "wasm-media",
      configHash: "hash",
      mediaIdentityDigest: "c".repeat(64),
      resumeAfter: {
        timestampUs: 1,
        timestampOrdinal: 0,
        nextPresentationIndex: 1,
      },
      committedBoundaries: [],
      coreState: new ArrayBuffer(0),
    },
  })
  const service = createAutoShotTaskService({
    createClient: () => {
      throw new Error("client must not start")
    },
    repository: store.repository as any,
    resolveConfig: (value) => value,
  })
  await assert.rejects(
    () =>
      service.start({
        projectId: "project-4",
        source: new Blob(),
        mediaIdentity,
        resolved,
        durationUs: 1_000_000,
        fpsNumerator: 30,
        fpsDenominator: 1,
        resume: true,
      }),
    /checkpoint/,
  )
  assert.equal(store.records.get("project-4").status, "interrupted")
})

test("synchronous engine start failure disposes the client", async () => {
  let disposed = 0
  const service = createAutoShotTaskService({
    createClient: () =>
      ({
        start: () => {
          throw new Error("engine unavailable")
        },
        dispose: async () => {
          disposed += 1
        },
      }) as any,
    repository: repository().repository as any,
    resolveConfig: (value) => value,
  })
  await assert.rejects(
    () =>
      service.start({
        projectId: "project-start-failure",
        source: new Blob(),
        mediaIdentity,
        resolved,
        durationUs: 1_000_000,
        fpsNumerator: 30,
        fpsDenominator: 1,
      }),
    /engine unavailable/,
  )
  assert.equal(disposed, 1)
})

test("initial persistence failure cancels the engine and disposes the client", async () => {
  const fake = fakeClient()
  let disposed = 0
  let cancelled = 0
  const service = createAutoShotTaskService({
    createClient: () =>
      ({
        ...fake.client,
        start: fake.client.start,
        dispose: async () => {
          disposed += 1
        },
      }) as any,
    repository: {
      async getAutoShotTask() {
        return null
      },
      async saveAutoShotTask() {
        throw new Error("storage unavailable")
      },
      async deleteAutoShotTask() {},
    } as any,
    resolveConfig: (value) => value,
  })
  fake.task.cancel = async () => {
    cancelled += 1
  }
  await assert.rejects(
    () =>
      service.start({
        projectId: "project-persistence-failure",
        source: new Blob(),
        mediaIdentity,
        resolved,
        durationUs: 1_000_000,
        fpsNumerator: 30,
        fpsDenominator: 1,
      }),
    /storage unavailable/,
  )
  assert.equal(cancelled, 1)
  assert.equal(disposed, 1)
})

test("progress persistence failure is surfaced in the terminal task record", async () => {
  const fake = fakeClient()
  const store = repository()
  let saves = 0
  const service = createAutoShotTaskService({
    createClient: () => fake.client as any,
    repository: {
      async getAutoShotTask(projectId: string) {
        return store.records.get(projectId) ?? null
      },
      async saveAutoShotTask(record: any) {
        saves += 1
        if (saves === 2) throw new Error("disk full")
        store.records.set(record.projectId, record)
      },
      async deleteAutoShotTask(projectId: string) {
        store.records.delete(projectId)
      },
    } as any,
    resolveConfig: (value) => value,
  })
  const handle = await service.start({
    projectId: "project-progress-failure",
    source: new Blob(),
    mediaIdentity,
    resolved,
    durationUs: 1_000_000,
    fpsNumerator: 30,
    fpsDenominator: 1,
  })
  fake.progress({
    processedUs: 100_000,
    durationUs: 1_000_000,
    decodedFrames: 3,
    newBoundaries: [],
    totalBoundaries: 0,
  })
  await new Promise((resolve) => setTimeout(resolve, 0))
  fake.resolve({
    status: "completed",
    result: {
      schemaVersion: 1,
      engineVersion: "wasm-media",
      configHash: "hash",
      media: {
        durationUs: 1_000_000,
        decodedFrames: 30,
        codedWidth: 96,
        codedHeight: 54,
      },
      boundaries: [],
      diagnostics: { backend: "wasm-baseline", elapsedMs: 1, peakWasmBytes: 0 },
    },
  })
  const completed = await handle.completion
  assert.equal(completed.status, "failed")
  assert.equal(completed.error?.code, "INTERNAL_ERROR")
  assert.match(completed.error?.message ?? "", /disk full/)
})
