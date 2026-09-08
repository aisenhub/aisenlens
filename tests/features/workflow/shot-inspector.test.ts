import assert from "node:assert/strict"
import test from "node:test"
import createShotInspectorViewModel from "../../../apps/web/src/features/analysis/services/shotInspectorViewModel.ts"

test("keeps user notes and unknown fields while exposing half-open range", () => {
  const model = createShotInspectorViewModel({
    shot: { id: "shot-1", start: 1, duration: 2, type: "中景", motion: "固定", color: "中性" },
    index: 0,
    frameRate: 24,
    frames: { first: 24, last: 71 },
    notes: { content: "真实画面", analysis: "我的理解" },
    fields: { custom: "保留" },
  })
  assert.equal(model.rangeLabel, "帧 24–71")
  assert.equal(model.durationSeconds, 2)
  assert.equal(model.description, "真实画面")
  assert.deepEqual(model.fields, { custom: "保留" })
  assert.deepEqual(model.sourceLabels, ["用户记录"])
})
