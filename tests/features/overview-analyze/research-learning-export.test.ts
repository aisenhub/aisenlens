import assert from "node:assert/strict"
import test from "node:test"
import deriveLearningSources from "../../../apps/web/src/features/learn/services/deriveLearningSources.ts"

const range = {
  id: "range-1", projectId: "project-1", mediaIdentityDigest: "media-1", startUs: 1_000_000, endUs: 3_500_000,
  title: "走廊停顿", observation: "人物在门口停顿", interpretation: "声音先于动作制造迟疑", summary: "用停顿延迟信息释放",
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", revision: 1,
}

const context = {
  id: "context-1", projectId: "project-1", target: { kind: "range" as const, id: range.id }, question: "停顿如何改变期待？",
  status: "completed" as const, needsReview: false, needsReviewReasons: [], structureRevision: 1,
  evidence: [{ id: "point-1", kind: "time-point" as const, mediaIdentityDigest: "media-1", atUs: 2_000_000 }],
  createdAt: range.createdAt, updatedAt: range.updatedAt, revision: 1,
}

test("research range is a real Learn source without duplicating shot notes", () => {
  const sources = deriveLearningSources({ shots: [], groups: [], notes: {}, researchRanges: [range], researchContexts: [context] })
  assert.deepEqual(sources, [{ id: range.id, kind: "range", title: range.title, rangeLabel: "1.00–3.50 s", excerpt: "停顿如何改变期待？\n用停顿延迟信息释放", shotId: null }])
})
