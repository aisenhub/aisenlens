import assert from "node:assert/strict"
import test from "node:test"
import { classifyPresentationTimestamps, frameToTimestampFromArrays, timestampToFrameIndex } from "../../../apps/web/src/features/video/services/mediaFrameTimeService.ts"

test("识别 24000/1001 与 30000/1001 CFR PTS，不受浮点舍入影响", () => {
  const ntscFilm = Array.from({ length: 4 }, (_, frame) => frame * 1001 / 24000)
  const ntscVideo = Array.from({ length: 4 }, (_, frame) => frame * 1001 / 30000)
  assert.equal(classifyPresentationTimestamps(ntscFilm, 23.976), "cfr")
  assert.equal(classifyPresentationTimestamps(ntscVideo, 29.97), "cfr")
  assert.equal(frameToTimestampFromArrays(ntscFilm, Array(4).fill(1001 / 24000), 3), 3 * 1001 / 24000)
})

test("VFR 使用实际 PTS 选择帧，不把平均 fps 当成映射", () => {
  const timestamps = [0, 0.04, 0.09, 0.13]
  assert.equal(classifyPresentationTimestamps(timestamps, 25), "vfr")
  assert.equal(timestampToFrameIndex(timestamps, 0.089), 1)
  assert.equal(timestampToFrameIndex(timestamps, 0.09), 2)
})
