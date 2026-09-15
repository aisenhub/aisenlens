import test from "node:test"
import assert from "node:assert/strict"
import { isSuggestedBoundaryStale, suggestSceneBoundaries } from "../src/features/auto-shot/services/suggestStructureBoundaries.ts"
import type { AutoShotCandidate } from "../src/features/auto-shot/types.ts"

const candidate = (id: string, endFrame: number, kind: AutoShotCandidate["kind"] = "hard-cut"): AutoShotCandidate => ({ id, kind, startFrame: endFrame - 10, endFrame, boundary: null, transitionRange: null, score: 160, threshold: 100, detectors: ["content"], evidence: { luma: 160 }, engineVersion: "scene-engine-test", configHash: "config-test" })

test("derives deterministic Scene suggestions only at formal shot boundaries", () => {
  const input = { runId: "run-1", mediaIdentityDigest: "media-1", structureRevision: 4, shots: [{ id: "s1", startFrame: 0, endFrame: 10 }, { id: "s2", startFrame: 10, endFrame: 20 }, { id: "s3", startFrame: 20, endFrame: 30 }], candidates: [candidate("c1", 20), candidate("c2", 30)] }
  const first = suggestSceneBoundaries(input)
  const second = suggestSceneBoundaries(input)
  assert.deepEqual(first, second)
  assert.deepEqual(first.map((item) => item.afterShotId), ["s2"])
  assert.equal("score" in (first[0] ?? {}), false)
  assert.equal(first[0]?.evidence[0]?.rawScore, 160)
})

test("marks a suggestion stale when media or structure revision changes", () => {
  const suggestion = suggestSceneBoundaries({ runId: "run-1", mediaIdentityDigest: "media-1", structureRevision: 4, shots: [{ id: "s1", startFrame: 0, endFrame: 10 }, { id: "s2", startFrame: 10, endFrame: 20 }], candidates: [candidate("c1", 10)] })[0]!
  assert.equal(isSuggestedBoundaryStale(suggestion, { mediaIdentityDigest: "media-1", structureRevision: 4 }), false)
  assert.equal(isSuggestedBoundaryStale(suggestion, { mediaIdentityDigest: "media-1", structureRevision: 5 }), true)
  assert.equal(isSuggestedBoundaryStale(suggestion, { mediaIdentityDigest: "media-2", structureRevision: 4 }), true)
})
