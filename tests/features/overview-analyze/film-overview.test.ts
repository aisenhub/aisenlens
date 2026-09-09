import test from "node:test"
import assert from "node:assert/strict"
import deriveFilmOverview from "../../../apps/web/src/features/overview/services/deriveFilmOverview.ts"

const shot = (id: string, start: number, duration: number) => ({ id, start, duration, type: "", motion: "", color: "" })

test("uses the mean of the two middle values for an even median", () => {
  const facts = deriveFilmOverview({ shots: [shot("a", 0, 1), shot("b", 1, 2), shot("c", 3, 3), shot("d", 6, 4)], shotFrames: {}, groups: [], markers: [], durationSeconds: 10, frameRate: null })
  assert.equal(facts.medianShotSeconds, 2.5)
})

test("computes real 10-second density bins and a shorter final bin", () => {
  const facts = deriveFilmOverview({ shots: [shot("a", 0, 2), shot("b", 2, 2), shot("c", 10, 1), shot("d", 11, 1)], shotFrames: {}, groups: [], markers: [], durationSeconds: 12, frameRate: null })
  assert.deepEqual(facts.densityWindows.map((item) => [item.startSeconds, item.durationSeconds, item.cutCount]), [[0, 10, 1], [10, 2, 2]])
  assert.equal(facts.densityWindows[1].cutsPerMinute, 60)
})
