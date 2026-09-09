import test from "node:test"
import assert from "node:assert/strict"
import { projectShotsIntoResearchRange, validateResearchRange } from "../../../apps/web/src/features/analysis/services/researchRangeService.ts"

test("research ranges use integer microseconds and half-open overlap", () => {
  assert.equal(validateResearchRange({ startUs: 0, endUs: 1_000_000, mediaDurationUs: 2_000_000 }), null)
  assert.match(validateResearchRange({ startUs: 1, endUs: 1, mediaDurationUs: 2_000_000 }) ?? "", /正向/)
  assert.match(validateResearchRange({ startUs: 0, endUs: 3_000_000, mediaDurationUs: 2_000_000 }) ?? "", /时长/)
})

test("range projection includes shots that genuinely intersect, not boundary-only shots", () => {
  const shots = [
    { id: "a", start: 0, duration: 1, type: "", motion: "", color: "" },
    { id: "b", start: 1, duration: 1, type: "", motion: "", color: "" },
    { id: "c", start: 2, duration: 1, type: "", motion: "", color: "" },
  ]
  assert.deepEqual(projectShotsIntoResearchRange(shots, { startUs: 1_000_000, endUs: 2_000_000 }), ["b"])
  assert.deepEqual(projectShotsIntoResearchRange(shots, { startUs: 1_500_000, endUs: 2_500_000 }), ["b", "c"])
})

