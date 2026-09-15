import test from "node:test"
import assert from "node:assert/strict"
import { resolveStructureContextAtFrame } from "../src/features/group/services/structureContext.ts"
import { clusterTimelinePoints, resolveShotLabel, resolveTimelineDetailLevel } from "../src/features/timeline/timelineSemantics.ts"

const shots = [0, 1, 2, 3].map((index) => ({ id: `s${index + 1}`, startFrame: index * 10, endFrame: (index + 1) * 10 }))
const makeGroup = (kind: "scene" | "sequence" | "section", shotIds: string[], id: string) => ({ id, projectId: "p1", kind, shotIds, title: id, summary: "", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" })

test("resolves half-open structure context at frame boundaries", () => {
  const context = resolveStructureContextAtFrame({ frame: 20, shots, frameRate: 10, groups: [makeGroup("scene", ["s1", "s2"], "scene-1"), makeGroup("sequence", ["s1", "s2", "s3"], "sequence-1")] })
  assert.equal(context.shotId, "s3")
  assert.equal(context.sceneId, null)
  assert.equal(context.sequenceId, "sequence-1")
})

test("returns ambiguity instead of guessing overlapping context", () => {
  const context = resolveStructureContextAtFrame({ frame: 5, shots, frameRate: 10, groups: [makeGroup("scene", ["s1"], "scene-1"), makeGroup("scene", ["s1"], "scene-2")] })
  assert.equal(context.sceneId, null)
  assert.ok(context.issues.some((issue) => issue.includes("scene")))
})

test("does not infer context through a sparse invalid structure", () => {
  const context = resolveStructureContextAtFrame({ frame: 15, shots, frameRate: 10, groups: [makeGroup("scene", ["s1", "s3"], "scene-sparse")] })
  assert.equal(context.sceneId, null)
  assert.ok(context.issues.some((issue) => issue.includes("连续")))
})

test("keeps semantic detail thresholds and clusters dense markers", () => {
  assert.equal(resolveTimelineDetailLevel(19.99), "overview")
  assert.equal(resolveTimelineDetailLevel(240), "frame-detail")
  assert.equal(resolveShotLabel({ index: 2, durationSeconds: 1.234, pixelsPerSecond: 12, detail: "overview", incomplete: false }), "")
  const clusters = clusterTimelinePoints([{ frame: 10 }, { frame: 11 }, { frame: 100 }], 24, 24, 0, 10)
  assert.equal(clusters.length, 2)
  assert.equal(clusters[0]?.items.length, 2)
  const frameDetail = clusterTimelinePoints([{ frame: 11 }, { frame: 10 }, { frame: 10 }], 24, 240, 0, 10, { maxFrameDistance: 0 })
  assert.deepEqual(frameDetail.map((cluster) => [cluster.frame, cluster.items.length]), [[10, 2], [11, 1]])
})
