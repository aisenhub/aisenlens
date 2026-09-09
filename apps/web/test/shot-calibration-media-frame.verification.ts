import {
  classifyPresentationTimestamps,
  inspectMediaFrameTimeline,
  timestampToFrame,
} from "../src/features/video/services/mediaFrameTimeService"

export async function runShotCalibrationMediaFrameVerification() {
  const synthetic = await inspectMediaFrameTimeline("/test/fixtures/auto-shot/synthetic.webm", 30)
  const ntsc24000 = classifyPresentationTimestamps(Array.from({ length: 8 }, (_, frame) => frame * 1_001 / 24_000), 24_000 / 1_001)
  const ntsc30000 = classifyPresentationTimestamps(Array.from({ length: 8 }, (_, frame) => frame * 1_001 / 30_000), 30_000 / 1_001)
  const vfrTimestamps = [0, 1 / 30, 2 / 30, 4 / 30, 5 / 30]
  const vfr = classifyPresentationTimestamps(vfrTimestamps, 30)
  const mappedFrame = timestampToFrame(synthetic, synthetic.points[Math.min(60, synthetic.totalFrames - 1)]?.timestamp ?? 0)
  const result = {
    fixture: {
      timingMode: synthetic.timingMode,
      totalFrames: synthetic.totalFrames,
      durationSeconds: synthetic.durationSeconds,
      firstPts: synthetic.points[0]?.timestamp,
      lastPts: synthetic.points.at(-1)?.timestamp,
      mappedFrame,
    },
    rationalFrameRates: { ntsc24000, ntsc30000 },
    syntheticVfr: vfr,
    productionVfrFixture: "not-present-in-repository",
  }
  if (!(["cfr", "vfr"] as const).includes(synthetic.timingMode) || synthetic.totalFrames < 300 || mappedFrame < 0 || mappedFrame >= synthetic.totalFrames || ntsc24000 !== "cfr" || ntsc30000 !== "cfr" || vfr !== "vfr") {
    throw new Error(`媒体帧时间基准验证失败: ${JSON.stringify(result)}`)
  }
  return result
}
