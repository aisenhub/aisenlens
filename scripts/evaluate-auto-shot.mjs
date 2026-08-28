import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

const repositoryDirectory = resolve(import.meta.dirname, "..")
const defaultManifestPath = resolve(repositoryDirectory, "apps", "web", "test", "fixtures", "auto-shot", "manifest.example.json")
const defaultReportPath = resolve(repositoryDirectory, "test-results", "auto-shot-baseline.json")

function argumentValue(name, fallback) {
  const index = process.argv.indexOf(name)
  return index >= 0 && process.argv[index + 1] ? resolve(process.cwd(), process.argv[index + 1]) : fallback
}

function roundDiv(numerator, denominator) {
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator)
}

function ceilDiv(numerator, denominator) {
  return Math.floor((numerator + denominator - 1) / denominator)
}

function projectFrame(timestampUs, fixture) {
  const fpsQ = roundDiv(fixture.timebase.fpsNumerator * 1_000_000, fixture.timebase.fpsDenominator)
  const frameDenominator = 1_000_000 * 1_000_000
  const durationFrames = Math.max(1, ceilDiv(fixture.timebase.durationUs * fpsQ, frameDenominator))
  const projected = ceilDiv(timestampUs * fpsQ, frameDenominator)
  return Math.min(Math.max(projected, 1), durationFrames - 1)
}

function percentile(values, fraction) {
  if (!values.length) return null
  const ordered = [...values].sort((left, right) => left - right)
  return ordered[Math.max(0, Math.ceil(ordered.length * fraction) - 1)]
}

function matchOneToOne(expected, predicted, tolerance) {
  const candidates = []
  expected.forEach((expectedFrame, expectedIndex) => {
    predicted.forEach((predictedFrame, predictedIndex) => {
      const distance = Math.abs(predictedFrame - expectedFrame)
      if (distance <= tolerance) candidates.push({ distance, expectedFrame, expectedIndex, predictedFrame, predictedIndex })
    })
  })
  candidates.sort((left, right) => left.distance - right.distance || left.predictedFrame - right.predictedFrame || left.expectedFrame - right.expectedFrame || left.predictedIndex - right.predictedIndex || left.expectedIndex - right.expectedIndex)
  const matchedExpected = new Set()
  const matchedPredicted = new Set()
  const matches = []
  for (const candidate of candidates) {
    if (matchedExpected.has(candidate.expectedIndex) || matchedPredicted.has(candidate.predictedIndex)) continue
    matchedExpected.add(candidate.expectedIndex)
    matchedPredicted.add(candidate.predictedIndex)
    matches.push(candidate)
  }
  return matches.sort((left, right) => left.expectedIndex - right.expectedIndex)
}

function scoreHardCuts(expected, predicted, tolerance) {
  const matches = matchOneToOne(expected, predicted, tolerance)
  const signedOffsets = matches.map(({ predictedFrame, expectedFrame }) => predictedFrame - expectedFrame)
  const absoluteOffsets = signedOffsets.map(Math.abs)
  const tp = matches.length
  const fp = predicted.length - tp
  const fn = expected.length - tp
  const precision = tp + fp ? tp / (tp + fp) : null
  const recall = tp + fn ? tp / (tp + fn) : null
  const f1 = precision !== null && recall !== null ? (precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0) : null
  return {
    toleranceFrames: tolerance,
    tp,
    fp,
    fn,
    precision,
    recall,
    f1,
    meanSignedOffsetFrames: signedOffsets.length ? signedOffsets.reduce((sum, value) => sum + value, 0) / signedOffsets.length : null,
    meanAbsoluteOffsetFrames: absoluteOffsets.length ? absoluteOffsets.reduce((sum, value) => sum + value, 0) / absoluteOffsets.length : null,
    p95AbsoluteOffsetFrames: percentile(absoluteOffsets, 0.95),
    matches,
  }
}

function scoreFades(fades, predicted, fixture) {
  const expected = fades.map((fade) => ({
    ...fade,
    startFrame: projectFrame(fade.startUs, fixture),
    endFrame: Math.max(projectFrame(fade.endUs, fixture), projectFrame(fade.startUs, fixture) + 1),
    boundaryFrame: fade.boundaryUs === undefined ? null : projectFrame(fade.boundaryUs, fixture),
  }))
  const candidates = []
  expected.forEach((fade, fadeIndex) => {
    predicted.forEach((predictedFrame, predictedIndex) => {
      if (fade.boundaryFrame !== null && predictedFrame === fade.boundaryFrame) candidates.push({ distance: 0, fadeIndex, predictedIndex, predictedFrame })
      else if (predictedFrame >= fade.startFrame && predictedFrame < fade.endFrame) candidates.push({ distance: Math.abs(predictedFrame - (fade.boundaryFrame ?? fade.startFrame)), fadeIndex, predictedIndex, predictedFrame })
    })
  })
  candidates.sort((left, right) => left.distance - right.distance || left.predictedFrame - right.predictedFrame || left.predictedIndex - right.predictedIndex)
  const usedFades = new Set()
  const usedPredictions = new Set()
  const matches = []
  for (const candidate of candidates) {
    if (usedFades.has(candidate.fadeIndex) || usedPredictions.has(candidate.predictedIndex)) continue
    usedFades.add(candidate.fadeIndex)
    usedPredictions.add(candidate.predictedIndex)
    matches.push(candidate)
  }
  return {
    annotatedFades: expected.length,
    predictedPoints: predicted.length,
    matchedFades: matches.length,
    recall: expected.length ? matches.length / expected.length : null,
    falsePositivePoints: predicted.length - matches.length,
    matches,
  }
}

const manifest = JSON.parse(await readFile(argumentValue("--manifest", defaultManifestPath), "utf8"))
const baseline = JSON.parse(await readFile(argumentValue("--report", defaultReportPath), "utf8"))
const fixture = manifest.fixtures.find((entry) => entry.enabled && entry.sha256 === baseline.fixture.sha256) ?? manifest.fixtures.find((entry) => entry.enabled)
if (!fixture) throw new Error("manifest 中没有启用且可匹配的 fixture。")
const predicted = [...(baseline.run.cuts ?? [])].map((cut) => cut.frame).sort((left, right) => left - right)
const expectedHardCuts = fixture.annotations.hardCuts.map((cut) => projectFrame(cut.timestampUs, fixture)).sort((left, right) => left - right)
const hardCuts = [0, 1, 2].map((tolerance) => scoreHardCuts(expectedHardCuts, predicted, tolerance))
const fades = scoreFades(fixture.annotations.fades, predicted, fixture)
const evaluation = {
  generatedAt: new Date().toISOString(),
  fixture: { id: fixture.id, sha256: fixture.sha256, path: fixture.path },
  baseline: { generatedAt: baseline.generatedAt, browser: baseline.browser, environment: baseline.environment, metrics: baseline.metrics },
  expected: { hardCutFrames: expectedHardCuts, fadeIntervals: fixture.annotations.fades },
  predicted: { hardCutFrames: predicted, cuts: baseline.run.cuts ?? [] },
  hardCuts,
  fades,
}
const outputPath = argumentValue("--output", resolve(repositoryDirectory, "test-results", "auto-shot-evaluation.json"))
await writeFile(outputPath, JSON.stringify(evaluation, null, 2), "utf8")
console.log(JSON.stringify(evaluation, null, 2))
