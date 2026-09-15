import test from "node:test"
import assert from "node:assert/strict"
import { applyShotChangeToResearchContexts } from "../src/features/analysis/services/shotResearchImpact.ts"
import type { ResearchContext } from "../src/features/analysis/types.ts"

const context = (target: ResearchContext["target"]): ResearchContext => ({ id: "ctx-1", projectId: "p1", target, question: "问题", status: "in-progress", needsReview: false, needsReviewReasons: [], structureRevision: 2, evidence: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", revision: 3 })

test("split marks the original shot research context for review", () => {
  const [next] = applyShotChangeToResearchContexts([context({ kind: "shot", id: "s2" })], { kind: "split", originalShotId: "s2", newShotId: "s2b" }, "2026-01-02T00:00:00.000Z")
  assert.equal(next?.needsReview, true)
  assert.equal(next?.structureRevision, 3)
  assert.match(next?.needsReviewReasons[0] ?? "", /分割/)
})

test("merge preserves the removed shot context as an inspectable review record", () => {
  const [next] = applyShotChangeToResearchContexts([context({ kind: "shot", id: "s3" })], { kind: "merge", retainedShotId: "s2", removedShotId: "s3" }, "2026-01-02T00:00:00.000Z")
  assert.equal(next?.target.id, "s3")
  assert.equal(next?.needsReview, true)
  assert.match(next?.needsReviewReasons[0] ?? "", /合并/)
})
