import assert from "node:assert/strict"
import test from "node:test"
import deriveFilmOverview from "../../../apps/web/src/features/overview/services/deriveFilmOverview.ts"

const shots = [
  { id: "a", start: 0, duration: 2, type: "未分析", motion: "未分析", color: "未分析" },
  { id: "b", start: 2, duration: 4, type: "未分析", motion: "未分析", color: "未分析" },
  { id: "c", start: 6, duration: 2, type: "未分析", motion: "未分析", color: "未分析" },
] as const

test("derives deterministic facts from formal half-open frame ranges", () => {
  const facts = deriveFilmOverview({
    shots: [...shots],
    shotFrames: { a: { first: 0, last: 59 }, b: { first: 60, last: 179 }, c: { first: 180, last: 239 } },
    groups: [],
    markers: [],
    durationSeconds: 8,
    frameRate: 30,
  })
  assert.equal(facts.shotCount, 3)
  assert.equal(facts.averageShotSeconds, 8 / 3)
  assert.equal(facts.medianShotSeconds, 2)
  assert.equal(facts.cutsPerMinute, 15)
})

test("does not invent time metrics when fps is unknown", () => {
  const facts = deriveFilmOverview({ shots: [], shotFrames: {}, groups: [], markers: [], durationSeconds: 0, frameRate: null })
  assert.equal(facts.totalDurationSeconds, null)
  assert.equal(facts.averageShotSeconds, null)
  assert.equal(facts.cutsPerMinute, null)
})
