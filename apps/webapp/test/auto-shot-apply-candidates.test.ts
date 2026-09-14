import assert from "node:assert/strict"
import test from "node:test"
import { applyAutoShotCandidates } from "../src/features/auto-shot/applyAutoShotCandidates.ts"

const candidate = (id: string, startFrame: number, endFrame: number) => ({
  id,
  kind: "hard-cut" as const,
  startFrame,
  endFrame,
  boundary: null,
  transitionRange: null,
  score: 1,
  threshold: 1,
  detectors: [],
  evidence: {},
  engineVersion: "wasm",
  configHash: "fnv1a64-v1:0000000000000000",
})

test("applies continuous half-open candidates and preserves unchanged ranges", () => {
  const result = applyAutoShotCandidates({
    candidates: [candidate("a", 0, 10), candidate("b", 10, 20)],
    totalFrames: 20,
    frameRate: 10,
    currentShots: [
      {
        id: "existing",
        start: 0,
        duration: 1,
        type: "近景",
        motion: "固定",
        color: "中性",
      },
    ],
    currentShotFrames: { existing: { first: 0, last: 9 } },
  })
  assert.equal(result.shots[0]?.id, "existing")
  assert.equal(result.shots[0]?.type, "近景")
  assert.equal(result.shots[0]?.motion, "固定")
  assert.equal(result.shots[0]?.color, "中性")
  assert.equal(result.shots[1]?.start, 1)
  assert.equal(result.summary.preservedCount, 1)
  assert.equal(result.summary.createdCount, 1)
})

test("rejects gaps, overlaps, and incomplete coverage", () => {
  assert.throws(
    () =>
      applyAutoShotCandidates({
        candidates: [candidate("a", 0, 9), candidate("b", 10, 20)],
        totalFrames: 20,
        frameRate: 10,
        currentShots: [],
        currentShotFrames: {},
      }),
    /连续/,
  )
})

test("excludes reviewed candidates by merging adjacent ranges", () => {
  const result = applyAutoShotCandidates({
    candidates: [candidate("a", 0, 10), candidate("b", 10, 20)],
    excludedCandidateIds: ["b"],
    totalFrames: 20,
    frameRate: 10,
    currentShots: [],
    currentShotFrames: {},
  })
  assert.deepEqual(result.shotFrames[result.shots[0]!.id], {
    first: 0,
    last: 19,
  })
})

test("reconciles groups atomically with the applied shot result", () => {
  const result = applyAutoShotCandidates({
    candidates: [candidate("a", 0, 10), candidate("b", 10, 20)],
    totalFrames: 20,
    frameRate: 10,
    currentShots: [
      {
        id: "first",
        start: 0,
        duration: 1,
        type: "近景",
        motion: "固定",
        color: "中性",
      },
      {
        id: "second",
        start: 1,
        duration: 1,
        type: "远景",
        motion: "移动",
        color: "中性",
      },
    ],
    currentShotFrames: {
      first: { first: 0, last: 9 },
      second: { first: 10, last: 19 },
    },
    currentGroups: [
      {
        id: "group",
        projectId: "project",
        kind: "scene",
        title: "场景 1",
        summary: "",
        shotIds: ["first", "second"],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  })
  assert.deepEqual(
    result.groups.map((group) => group.shotIds),
    [["first", "second"]],
  )
  assert.equal(result.summary.changedGroupCount, 0)
  assert.equal(result.summary.removedGroupCount, 0)
})

test("drops groups whose members no longer form a valid contiguous range", () => {
  const result = applyAutoShotCandidates({
    candidates: [candidate("a", 0, 20)],
    totalFrames: 20,
    frameRate: 10,
    currentShots: [
      {
        id: "first",
        start: 0,
        duration: 1,
        type: "近景",
        motion: "固定",
        color: "中性",
      },
      {
        id: "second",
        start: 1,
        duration: 1,
        type: "远景",
        motion: "移动",
        color: "中性",
      },
    ],
    currentShotFrames: {
      first: { first: 0, last: 9 },
      second: { first: 10, last: 19 },
    },
    currentGroups: [
      {
        id: "group",
        projectId: "project",
        kind: "scene",
        title: "场景 1",
        summary: "",
        shotIds: ["first", "second"],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  })
  assert.deepEqual(result.groups, [])
  assert.equal(result.summary.removedGroupCount, 1)
})
