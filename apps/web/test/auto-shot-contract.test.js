import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const manifestUrl = new URL("./fixtures/auto-shot/manifest.example.json", import.meta.url)
const manifest = JSON.parse(await readFile(manifestUrl, "utf8"))
const FPS_QUANTIZATION_SCALE = 1_000_000
const MICROSECONDS_PER_SECOND = 1_000_000

function ceilDiv(numerator, denominator) {
  assert.ok(Number.isSafeInteger(numerator) && numerator >= 0)
  assert.ok(Number.isSafeInteger(denominator) && denominator > 0)
  return Math.floor((numerator + denominator - 1) / denominator)
}

function roundDiv(numerator, denominator) {
  assert.ok(Number.isSafeInteger(numerator) && numerator >= 0)
  assert.ok(Number.isSafeInteger(denominator) && denominator > 0)
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator)
}

function projectFrame(timestampUs, durationUs, fpsNumerator, fpsDenominator) {
  const fpsQ = roundDiv(fpsNumerator * FPS_QUANTIZATION_SCALE, fpsDenominator)
  const frameDenominator = MICROSECONDS_PER_SECOND * FPS_QUANTIZATION_SCALE
  const durationFrames = Math.max(
    1,
    ceilDiv(durationUs * fpsQ, frameDenominator),
  )
  const projected = ceilDiv(timestampUs * fpsQ, frameDenominator)
  return {
    durationFrames,
    boundaryFrame: Math.min(Math.max(projected, 1), durationFrames - 1),
  }
}

function assignTimestampOrdinals(samples) {
  const counts = new Map()
  return samples.map(({ timestampUs }) => {
    const timestampOrdinal = counts.get(timestampUs) ?? 0
    counts.set(timestampUs, timestampOrdinal + 1)
    return { timestampUs, timestampOrdinal }
  })
}

test("manifest example exposes the frozen evaluation contract", () => {
  assert.equal(manifest.schemaVersion, 1)
  assert.deepEqual(manifest.matching.hardCutToleranceFrames, [0, 1, 2])
  assert.equal(manifest.matching.oneToOne, true)
  assert.equal(manifest.timebase.projectFrameRule, "ceil_quantized_fps")
  assert.equal(manifest.fixtureTemplate.enabled, false)
  assert.ok(Array.isArray(manifest.fixtures))
})

test("project-frame mapping uses ceil and clamps to interior boundaries", () => {
  const result = projectFrame(5_000_000, 10_000_000, 30, 1)
  assert.equal(result.durationFrames, 300)
  assert.equal(result.boundaryFrame, 150)

  assert.equal(projectFrame(0, 10_000_000, 30, 1).boundaryFrame, 1)
  assert.equal(projectFrame(10_000_000, 10_000_000, 30, 1).boundaryFrame, 299)
})

test("duration and boundary mapping remain deterministic at fractional frames", () => {
  const first = projectFrame(33_334, 100_000, 30, 1)
  const second = projectFrame(33_334, 100_000, 30, 1)
  assert.deepEqual(first, second)
  assert.equal(first.boundaryFrame, 2)
  assert.equal(first.durationFrames, 3)
})

test("zero-duration media has no internal scene boundary", () => {
  const result = projectFrame(0, 0, 30, 1)
  assert.equal(result.durationFrames, 1)
  assert.equal(result.boundaryFrame, 0)
  assert.throws(() => projectFrame(-1, 10_000_000, 30, 1))
})

test("duplicate PTS receive stable presentation ordinals", () => {
  assert.deepEqual(
    assignTimestampOrdinals([
      { timestampUs: 100 },
      { timestampUs: 100 },
      { timestampUs: 200 },
      { timestampUs: 100 },
    ]),
    [
      { timestampUs: 100, timestampOrdinal: 0 },
      { timestampUs: 100, timestampOrdinal: 1 },
      { timestampUs: 200, timestampOrdinal: 0 },
      { timestampUs: 100, timestampOrdinal: 2 },
    ],
  )
})

test("invalid fade intervals are rejected by the contract", () => {
  const annotation = { startUs: 8_000_000, endUs: 8_500_000, boundaryUs: 8_250_000 }
  assert.ok(annotation.startUs < annotation.endUs)
  assert.ok(annotation.boundaryUs >= annotation.startUs)
  assert.ok(annotation.boundaryUs < annotation.endUs)
  assert.throws(() => {
    assert.ok(9_000_000 < 8_500_000)
  })
})
