const DATABASE_NAME = "aisenlens-projects"
const LEGACY_VERSION = 12

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB 请求失败。"))
  })
}

function transactionResult(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB 事务失败。"))
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB 事务已取消。"))
  })
}

function createLegacyDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, LEGACY_VERSION)
    request.onerror = () =>
      reject(request.error ?? new Error("无法建立旧数据库夹具。"))
    request.onupgradeneeded = () => {
      const database = request.result
      const projects = database.createObjectStore("projects", { keyPath: "id" })
      projects.createIndex("updatedAt", "updatedAt", { unique: false })
      projects.createIndex("folderId", "folderId", { unique: false })
      const shots = database.createObjectStore("shots", { keyPath: "id" })
      shots.createIndex("projectId", "projectId", { unique: false })
      const screenshots = database.createObjectStore("screenshots", {
        keyPath: "id",
      })
      screenshots.createIndex("projectId", "projectId", { unique: false })
      const markers = database.createObjectStore("annotation-markers", {
        keyPath: "id",
      })
      markers.createIndex("projectId", "projectId", { unique: false })
      const runs = database.createObjectStore("auto-shot-runs", {
        keyPath: "id",
      })
      runs.createIndex("projectId", "projectId", { unique: true })
      database.createObjectStore("media-asset-handles", { keyPath: "assetId" })
      database.createObjectStore("media-asset-blobs", { keyPath: "assetId" })
      const screenshotBlobs = database.createObjectStore("screenshot-blobs", {
        keyPath: "id",
      })
      void screenshotBlobs
      const templates = database.createObjectStore("project-templates", {
        keyPath: "id",
      })
      templates.createIndex("projectId", "projectId", { unique: true })
      const thumbnails = database.createObjectStore(
        "derived-frame-thumbnails",
        { keyPath: "id" },
      )
      thumbnails.createIndex("projectId", "projectId", { unique: false })
      thumbnails.createIndex("projectFrame", ["projectId", "frame"], {
        unique: true,
      })
      const waveforms = database.createObjectStore("derived-waveforms", {
        keyPath: "id",
      })
      waveforms.createIndex("projectId", "projectId", { unique: true })
      const groups = database.createObjectStore("shot-groups", {
        keyPath: "id",
      })
      groups.createIndex("projectId", "projectId", { unique: false })
      const snapshots = database.createObjectStore("recovery-snapshots", {
        keyPath: "id",
      })
      snapshots.createIndex("projectId", "projectId", { unique: false })
      snapshots.createIndex("projectCreatedAt", ["projectId", "createdAt"], {
        unique: false,
      })
    }
    request.onsuccess = async () => {
      const database = request.result
      const transaction = database.transaction(
        [
          "projects",
          "shots",
          "screenshots",
          "annotation-markers",
          "auto-shot-runs",
        ],
        "readwrite",
      )
      const project = {
        id: "migration-project",
        title: "旧项目",
        description: "保留验证",
        shots: 1,
        notes: 1,
        folderId: null,
        coverScreenshotId: "migration-screenshot",
        mediaAssets: [],
        primaryVideoAssetId: null,
        audioTracks: [],
        compositionOverlay: {},
        contentOverlay: {},
        createdAt: "2026-08-28T00:00:00.000Z",
        updatedAt: "2026-08-28T00:00:00.000Z",
      }
      transaction.objectStore("projects").put(project)
      transaction
        .objectStore("shots")
        .put({
          id: "migration-shot",
          projectId: project.id,
          order: 0,
          startFrame: 0,
          endFrame: 24,
        })
      transaction
        .objectStore("screenshots")
        .put({ id: "migration-screenshot", projectId: project.id, frame: 0 })
      transaction
        .objectStore("annotation-markers")
        .put({ id: "migration-marker", projectId: project.id, frame: 12 })
      transaction.objectStore("auto-shot-runs").put({
        id: "legacy-run",
        projectId: project.id,
        mediaFingerprint: {
          name: "old.mp4",
          size: 10,
          lastModified: 1,
          mimeType: "video/mp4",
        },
        status: "completed",
        sensitivity: 0.5,
        minimumShotFrames: 12,
        cursorFrame: 24,
        durationFrames: 24,
        cuts: [{ frame: 12, confidence: 0.9, kind: "hard-cut" }],
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        errorMessage: null,
      })
      void transactionResult(transaction).then(() => {
        database.close()
        resolve()
      }, reject)
    }
  })
}

async function readStoreCount(storeName: string): Promise<number> {
  const request = indexedDB.open(DATABASE_NAME)
  const database = await requestResult(request)
  try {
    const transaction = database.transaction(storeName, "readonly")
    const count = await requestResult(
      transaction.objectStore(storeName).count(),
    )
    await transactionResult(transaction)
    return count
  } finally {
    database.close()
  }
}

export async function runProjectRepositoryMigrationVerification() {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME)
    request.onerror = () =>
      reject(request.error ?? new Error("无法清理迁移测试数据库。"))
    request.onsuccess = () => resolve()
    request.onblocked = () =>
      reject(new Error("迁移测试数据库仍被其他连接占用。"))
  })
  await createLegacyDatabase()
  const repository = (
    await import("../src/features/project/services/projectRepository.ts")
  ).default
  const project = await repository.getProject("migration-project")
  const shots = await repository.listProjectShots("migration-project")
  const markers =
    await repository.listProjectAnnotationMarkers("migration-project")
  const screenshots = await readStoreCount("screenshots")
  const legacyRuns = await readStoreCount("auto-shot-runs")
  const mediaIdentity = {
    identitySchema: "aisenlens-auto-shot-media-identity",
    schemaVersion: 1,
    contentDigestStrategy: "sha256-file-v1",
    contentDigest: "a".repeat(64),
    size: 20,
    codec: "avc1.640028",
    codedWidth: 1920,
    codedHeight: 1080,
    displayWidth: 1920,
    displayHeight: 1080,
    rotation: 0,
    durationUs: 1_000_000,
    mediaIdentityDigest: "b".repeat(64),
  } as const
  const task = {
    id: "task-roundtrip",
    projectId: "migration-project",
    mediaIdentity,
    review: { excludedCandidateIds: [], updatedAt: null, appliedAt: null },
    controlSnapshot: {
      schemaVersion: 1,
      detail: "balanced",
      transitions: "hard-cuts",
      minimumSceneDuration: { mode: "preset" },
      overrides: {},
      preset: { id: "general", version: 1, catalog: "research" },
    },
    config: {
      hardCut: {
        kind: "content",
        threshold: 2700,
        weights: { hue: 3333, saturation: 3333, luma: 3334 },
      },
      fade: null,
      minimumSceneDurationUs: 600000,
      analysis: { maxWidth: 96, temporalSampling: { kind: "every-frame" } },
      diagnostics: "off",
    },
    status: "completed",
    engineVersion: "wasm-media-simd",
    configHash: "fnv1a64-v1:d6c05e27c12b7519",
    progress: {
      processedUs: 1000000,
      durationUs: 1000000,
      decodedFrames: 30,
      candidateCount: 1,
    },
    candidates: [],
    checkpoint: null,
    result: null,
    error: null,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
  } as const
  await repository.saveAutoShotTask(task)
  const roundTrip = await repository.getAutoShotTask(
    "migration-project",
    mediaIdentity,
  )
  const mismatchedMedia = await repository.getAutoShotTask(
    "migration-project",
    { ...mediaIdentity, size: 21 },
  )
  await repository.saveAutoShotTask({
    ...task,
    id: "task-roundtrip-2",
    status: "failed",
  })
  const uniqueProjectTask = await repository.getAutoShotTask(
    "migration-project",
    mediaIdentity,
  )
  await repository.deleteAutoShotTask("migration-project")
  const deletedTask = await repository.getAutoShotTask(
    "migration-project",
    mediaIdentity,
  )
  const { createProjectRecoverySnapshot, restoreProjectRecoverySnapshot } =
    await import("../src/features/project/services/projectRecoveryService.ts")
  const recoverySnapshot =
    await createProjectRecoverySnapshot("migration-project")
  if (!recoverySnapshot || !project) throw new Error("恢复快照创建失败。")
  await repository.updateProject({ ...project, title: "已修改项目" })
  await repository.replaceProjectShots("migration-project", [
    {
      id: "temporary-shot",
      projectId: "migration-project",
      order: 0,
      startFrame: 3,
      endFrame: 8,
      status: "draft",
      detection: { source: "manual" },
      primaryScreenshotId: null,
      screenshotIds: [],
      firstFrameScreenshotId: null,
      lastFrameScreenshotId: null,
      analysisFields: {},
      description: "",
      notes: "",
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
  ])
  await restoreProjectRecoverySnapshot(recoverySnapshot.id, "migration-project")
  const restoredProject = await repository.getProject("migration-project")
  const restoredShots = await repository.listProjectShots("migration-project")
  const retentionBase = Date.parse("2026-08-28T01:00:00.000Z")
  for (let index = 0; index < 4; index += 1) {
    await repository.saveProjectRecoverySnapshot({
      ...recoverySnapshot,
      id: `retention-snapshot-${index}`,
      createdAt: new Date(retentionBase + index * 1_000).toISOString(),
    })
  }
  const retainedSnapshots =
    await repository.listProjectRecoverySnapshots("migration-project")
  return {
    projectPreserved:
      project?.id === "migration-project" && project.title === "旧项目",
    shotsPreserved: shots.length === 1 && shots[0]?.id === "migration-shot",
    markersPreserved:
      markers.length === 1 && markers[0]?.id === "migration-marker",
    screenshotsPreserved: screenshots === 1,
    legacyRuns,
    taskRoundTrip:
      roundTrip?.id === "task-roundtrip" &&
      roundTrip.engineVersion === "wasm-media-simd",
    mediaIdentityMismatchInvalidated: mismatchedMedia === null,
    projectTaskUnique: uniqueProjectTask?.id === "task-roundtrip-2",
    taskDeletion: deletedTask === null,
    recoveryRestored:
      restoredProject?.title === project.title &&
      restoredShots[0]?.id === "migration-shot",
    recoverySnapshotRetention:
      retainedSnapshots.length === 3 &&
      !retainedSnapshots.some(
        (snapshot) => snapshot.id === "retention-snapshot-0",
      ),
  }
}
