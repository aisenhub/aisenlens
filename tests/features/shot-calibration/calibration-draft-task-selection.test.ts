import test from "node:test"
import assert from "node:assert/strict"
import { createCalibrationDraft, createDetectionCalibrationDraft, formalShotsSignature, reconcileCalibrationDraftWithFormalShots, shouldSeedCalibrationFromDetection } from "../../../apps/webapp/src/features/shot-calibration/services/calibrationDraftService.ts"
import { applyCalibrationCommand } from "../../../apps/webapp/src/features/shot-calibration/services/calibrationCommandService.ts"

const identity = {
  identitySchema: "aisenlens-auto-shot-media-identity" as const,
  schemaVersion: 1 as const,
  contentDigestStrategy: "sha256-file-v1" as const,
  contentDigest: "a".repeat(64),
  size: 100,
  codec: "avc1",
  codedWidth: 1920,
  codedHeight: 1080,
  displayWidth: 1920,
  displayHeight: 1080,
  rotation: 0 as const,
  durationUs: 4_000_000,
  mediaIdentityDigest: "b".repeat(64),
}

test("自动分镜任务作为校准草稿来源时生成全部候选区段", () => {
  const task = {
    id: "task-1",
    projectId: "project-1",
    mediaIdentity: identity,
    review: { excludedCandidateIds: [], updatedAt: null, appliedAt: null },
    controlSnapshot: null,
    config: {} as never,
    status: "completed" as const,
    engineVersion: "test",
    configHash: "config",
    progress: { processedUs: 4_000_000, durationUs: 4_000_000, decodedFrames: 96, candidateCount: 3 },
    candidates: [
      { id: "candidate-1", kind: "hard-cut" as const, startFrame: 0, endFrame: 24, boundary: null, transitionRange: null, score: 1, threshold: 0.5, detectors: [], evidence: {}, engineVersion: "test", configHash: "config" },
      { id: "candidate-2", kind: "hard-cut" as const, startFrame: 24, endFrame: 60, boundary: null, transitionRange: null, score: 1, threshold: 0.5, detectors: [], evidence: {}, engineVersion: "test", configHash: "config" },
      { id: "candidate-3", kind: "tail" as const, startFrame: 60, endFrame: 96, boundary: null, transitionRange: null, score: 1, threshold: 0.5, detectors: [], evidence: {}, engineVersion: "test", configHash: "config" },
    ],
    checkpoint: null,
    result: null,
    error: null,
    createdAt: "now",
    updatedAt: "now",
  }
  const placeholder = [{ id: "placeholder", projectId: "project-1", order: 0, startFrame: 0, endFrame: 96, status: "draft" as const, detection: null, primaryScreenshotId: null, screenshotIds: [], firstFrameScreenshotId: null, lastFrameScreenshotId: null, analysisFields: {}, description: "", notes: "", createdAt: "now", updatedAt: "now" }]
  assert.equal(shouldSeedCalibrationFromDetection(task, placeholder), true)
  assert.equal(shouldSeedCalibrationFromDetection(task, [{ ...placeholder[0], detection: { source: "manual" }, analysisFields: { shot_description: "", shot: null, motion: null, color: null, sound: null, rhythm: null } }]), true)
  const draft = createCalibrationDraft({
    projectId: "project-1",
    mediaIdentity: identity,
    mediaSource: null,
    frameRate: 24,
    totalFrames: 96,
    baseProjectUpdatedAt: "now",
    task,
    shots: [],
  })
  assert.equal(draft.initialSource, "detection")
  assert.deepEqual(draft.segments.map((segment) => [segment.startFrame, segment.endFrame]), [[0, 24], [24, 60], [60, 96]])

  // A real editor shot can already have an automatically captured screenshot.
  // Applying detection must not rely on the empty-placeholder heuristic.
  const shots = [{ ...placeholder[0], primaryScreenshotId: "cover-frame", screenshotIds: ["cover-frame"] }]
  const seed = { projectId: "project-1", mediaIdentity: identity, mediaSource: null, frameRate: 24, totalFrames: 96, baseProjectUpdatedAt: "now", task, shots }
  assert.equal(shouldSeedCalibrationFromDetection(task, shots), false)
  const oldDraft = createCalibrationDraft({ ...seed, task: null })
  assert.equal(oldDraft.segments.length, 1)
  const applied = createDetectionCalibrationDraft(seed, oldDraft)
  assert.equal(applied.segments.length, 3)
  assert.equal(applied.revision, oldDraft.revision + 1)
  assert.equal(applied.initialSource, "detection")
  assert.equal(createDetectionCalibrationDraft(seed, applied), applied, "重复应用同一任务保留草稿修改")
  const newRun = createDetectionCalibrationDraft({ ...seed, task: { ...task, updatedAt: "later" } }, applied)
  assert.notEqual(newRun, applied)
  assert.equal(newRun.baseTaskUpdatedAt, "later")
  assert.equal(createDetectionCalibrationDraft(seed, { ...oldDraft, status: "conflict" }).segments.length, 3)
  const singleCandidate = { ...task, candidates: [{ ...task.candidates[2], startFrame: 0 }] }
  const splitShots = [{ ...shots[0], endFrame: 24 }, { ...shots[0], id: "second", order: 1, startFrame: 24 }]
  const singleDraft = createDetectionCalibrationDraft({ ...seed, task: singleCandidate, shots: splitShots }, null)
  assert.equal(singleDraft.initialSource, "detection")
  assert.equal(singleDraft.segments.length, 1, "单段检测结果也必须替换旧切点")
  assert.throws(() => createDetectionCalibrationDraft({ ...seed, task: { ...task, projectId: "other-project" } }, null), /不匹配/)
  assert.throws(() => createDetectionCalibrationDraft({ ...seed, task: { ...task, status: "running" } }, null), /完成/)
})

test("正式镜头内容变化不使校准草稿失效，结构变化会自动合并且保留手工切点", () => {
  const placeholder = { id: "placeholder", projectId: "project-1", order: 0, startFrame: 0, endFrame: 96, status: "draft" as const, detection: null, primaryScreenshotId: null, screenshotIds: [], firstFrameScreenshotId: null, lastFrameScreenshotId: null, analysisFields: {}, description: "", notes: "", createdAt: "now", updatedAt: "now" }
  const task = {
    id: "task-1",
    projectId: "project-1",
    mediaIdentity: identity,
    review: { excludedCandidateIds: [], updatedAt: null, appliedAt: null },
    controlSnapshot: null,
    config: {} as never,
    status: "completed" as const,
    engineVersion: "test",
    configHash: "config",
    progress: { processedUs: 4_000_000, durationUs: 4_000_000, decodedFrames: 96, candidateCount: 2 },
    candidates: [
      { id: "candidate-1", kind: "hard-cut" as const, startFrame: 0, endFrame: 24, boundary: null, transitionRange: null, score: 1, threshold: 0.5, detectors: [], evidence: {}, engineVersion: "test", configHash: "config" },
      { id: "candidate-2", kind: "tail" as const, startFrame: 24, endFrame: 96, boundary: null, transitionRange: null, score: 1, threshold: 0.5, detectors: [], evidence: {}, engineVersion: "test", configHash: "config" },
    ],
    checkpoint: null,
    result: null,
    error: null,
    createdAt: "now",
    updatedAt: "now",
  }
  const seed = { projectId: "project-1", mediaIdentity: identity, mediaSource: null, frameRate: 24, totalFrames: 96, baseProjectUpdatedAt: "before", task, shots: [placeholder] }
  const draft = applyCalibrationCommand(createCalibrationDraft(seed), { type: "splitAtFrame", frame: 12, expectedRevision: 0 }).draft
  const latestShots = [
    { ...placeholder, id: "shot-1", order: 0, endFrame: 36 },
    { ...placeholder, id: "shot-2", order: 1, startFrame: 36, endFrame: 96 },
  ]
  assert.equal(formalShotsSignature(latestShots), formalShotsSignature(latestShots.map((shot) => ({ ...shot, description: "已在深拆中补充内容", analysisFields: { shot: { state: "set" as const, value: "shot.medium" } } }))))
  const reconciled = reconcileCalibrationDraftWithFormalShots(draft, { baseProjectUpdatedAt: "after", shots: latestShots, task })
  assert.equal(reconciled.status, "editing")
  assert.deepEqual(reconciled.boundaries.map((boundary) => boundary.frame), [12, 24, 36])
  assert.equal(reconciled.baseProjectUpdatedAt, "after")
})

test("正式镜头来源的外部切分按稳定镜头 ID重定位边界，并保留校准中的手工移动", () => {
  const shot = (id: string, order: number, startFrame: number, endFrame: number) => ({ id, projectId: "project-1", order, startFrame, endFrame, status: "confirmed" as const, detection: { source: "manual" as const }, primaryScreenshotId: null, screenshotIds: [], firstFrameScreenshotId: null, lastFrameScreenshotId: null, analysisFields: {}, description: "", notes: "", createdAt: "now", updatedAt: "now" })
  const oldShots = [shot("shot-a", 0, 0, 48), shot("shot-b", 1, 48, 96)]
  const draft = createCalibrationDraft({ projectId: "project-1", mediaIdentity: identity, mediaSource: null, frameRate: 24, totalFrames: 96, baseProjectUpdatedAt: "before", task: null, shots: oldShots })
  const moved = applyCalibrationCommand(draft, { type: "moveBoundary", boundaryId: draft.boundaries[0]!.id, frame: 40, expectedRevision: 0 }).draft
  const latestShots = [shot("shot-a", 0, 0, 36), shot("shot-new", 1, 36, 48), shot("shot-b", 2, 48, 96)]
  const reconciled = reconcileCalibrationDraftWithFormalShots(moved, { baseProjectUpdatedAt: "after", shots: latestShots, task: null })
  assert.deepEqual(reconciled.boundaries.map((boundary) => boundary.frame), [40, 48])
  assert.equal(reconciled.boundaries.find((boundary) => boundary.wasManuallyAdjusted)?.frame, 40)
})
