import assert from "node:assert/strict"
import test from "node:test"
import { createCalibrationDraft, isTransientFullFilmPlaceholder } from "../../../apps/web/src/features/shot-calibration/services/calibrationDraftService.ts"
import { applyCalibrationCommand, CalibrationCommandError } from "../../../apps/web/src/features/shot-calibration/services/calibrationCommandService.ts"
import { addPlaybackCoverage, coverageFrames, mergeCoverageRanges } from "../../../apps/web/src/features/shot-calibration/services/reviewCoverageService.ts"

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

function createDraft() {
  return createCalibrationDraft({
    projectId: "project-1",
    mediaIdentity: identity,
    mediaSource: null,
    frameRate: 24,
    totalFrames: 96,
    baseProjectUpdatedAt: "2026-09-08T00:00:00.000Z",
    task: null,
    shots: [
      { id: "shot-a", projectId: "project-1", order: 0, startFrame: 0, endFrame: 48, status: "confirmed", detection: { source: "manual" }, primaryScreenshotId: null, screenshotIds: [], firstFrameScreenshotId: null, lastFrameScreenshotId: null, analysisFields: {}, description: "", notes: "", createdAt: "now", updatedAt: "now" },
      { id: "shot-b", projectId: "project-1", order: 1, startFrame: 48, endFrame: 96, status: "confirmed", detection: { source: "manual" }, primaryScreenshotId: null, screenshotIds: [], firstFrameScreenshotId: null, lastFrameScreenshotId: null, analysisFields: {}, description: "", notes: "", createdAt: "now", updatedAt: "now" },
    ],
  })
}

test("校准草稿覆盖全片并保留正式镜头身份", () => {
  const draft = createDraft()
  assert.deepEqual(draft.boundaries.map((boundary) => boundary.frame), [48])
  assert.deepEqual(draft.segments.map((segment) => [segment.startFrame, segment.endFrame]), [[0, 48], [48, 96]])
  assert.deepEqual(draft.segments.map((segment) => segment.id), ["shot-a", "shot-b"])
})

test("识别全片占位镜头，避免覆盖自动分镜候选", () => {
  const placeholder = [{ ...createDraft().segments[0], id: "placeholder", startFrame: 0, endFrame: 96 }]
  assert.equal(
    isTransientFullFilmPlaceholder(placeholder.map((segment) => ({
      id: segment.id,
      projectId: "project-1",
      order: 0,
      startFrame: segment.startFrame,
      endFrame: segment.endFrame,
      status: "draft" as const,
      detection: null,
      primaryScreenshotId: null,
      screenshotIds: [],
      firstFrameScreenshotId: null,
      lastFrameScreenshotId: null,
      analysisFields: {},
      description: "",
      notes: "",
      createdAt: "now",
      updatedAt: "now",
    }))),
    true,
  )
})

test("补切、移点、合并保持稳定 ID 且不修改源草稿", () => {
  const draft = createDraft()
  const split = applyCalibrationCommand(draft, { type: "splitAtFrame", frame: 24, expectedRevision: 0 }).draft
  assert.equal(split.segments[0]?.id, "shot-a")
  assert.equal(split.segments[1]?.startFrame, 24)
  assert.equal(split.segments[2]?.id, "shot-b")
  assert.deepEqual(draft.boundaries.map((boundary) => boundary.frame), [48])

  const moved = applyCalibrationCommand(split, { type: "moveBoundary", boundaryId: split.boundaries[1]!.id, frame: 47, expectedRevision: split.revision }).draft
  assert.equal(moved.boundaries[1]?.frame, 47)
  const merged = applyCalibrationCommand(moved, { type: "removeBoundary", boundaryId: moved.boundaries[0]!.id, expectedRevision: moved.revision }).draft
  assert.equal(merged.segments.length, 2)
  assert.equal(merged.segments[0]?.id, "shot-a")
})

test("移点越过相邻镜头时 clamp，并拒绝过期命令", () => {
  const draft = createDraft()
  const result = applyCalibrationCommand(draft, { type: "moveBoundary", boundaryId: draft.boundaries[0]!.id, frame: 999, expectedRevision: 0 })
  assert.equal(result.draft.boundaries[0]?.frame, 95)
  assert.throws(() => applyCalibrationCommand(result.draft, { type: "splitAtFrame", frame: 10, expectedRevision: 0 }), (error) => error instanceof CalibrationCommandError && error.code === "revision-conflict")
})

test("待回看去重、处理和巡视范围并集独立计算", () => {
  const draft = createDraft()
  const issue = applyCalibrationCommand(draft, { type: "addReviewIssue", frame: 12, note: "检查动作变化", expectedRevision: 0 }).draft
  assert.equal(issue.issues.length, 1)
  assert.throws(() => applyCalibrationCommand(issue, { type: "addReviewIssue", frame: 12, note: "重复", expectedRevision: 1 }), (error) => error instanceof CalibrationCommandError && error.code === "duplicate-issue")
  const resolved = applyCalibrationCommand(issue, { type: "resolveIssue", issueId: issue.issues[0]!.id, expectedRevision: 1 }).draft
  assert.equal(resolved.issues[0]?.status, "resolved")
  const coverage = addPlaybackCoverage(addPlaybackCoverage([], 0, 24), 12, 48)
  assert.equal(coverageFrames(coverage), 48)
  assert.deepEqual(mergeCoverageRanges([{ startFrame: 0, endFrame: 3 }, { startFrame: 3, endFrame: 6 }], 10), [{ startFrame: 0, endFrame: 6 }])
})

test("结构性改切使受影响的显式复核失效，但保留巡视轨迹", () => {
  const draft = createDraft()
  const reviewed = applyCalibrationCommand(draft, { type: "addReviewRange", startFrame: 0, endFrame: 48, kind: "explicit", expectedRevision: 0 }).draft
  const observed = applyCalibrationCommand(reviewed, { type: "addReviewRange", startFrame: 0, endFrame: 48, kind: "playback", expectedRevision: 1 }).draft
  const changed = applyCalibrationCommand(observed, { type: "splitAtFrame", frame: 24, expectedRevision: 2 }).draft
  assert.deepEqual(changed.reviewRanges.filter((range) => range.kind === "explicit"), [
    { ...reviewed.reviewRanges[0], endFrame: 23 },
    { ...reviewed.reviewRanges[0], id: `${reviewed.reviewRanges[0]!.id}:tail`, startFrame: 25 },
  ])
  assert.equal(changed.reviewRanges.some((range) => range.kind === "playback"), true)
})
