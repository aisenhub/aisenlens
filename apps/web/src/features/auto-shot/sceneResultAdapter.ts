import type { Microseconds, SceneBoundary, SceneEngineResult } from "@aisenlens/scene-engine";
import type { AutoShotCandidate } from "./types";

const FPS_QUANTIZATION_SCALE = 1_000_000;
const MICROSECONDS_PER_SECOND = 1_000_000;

export interface SceneResultAdapterInput {
  result: SceneEngineResult;
  durationUs: Microseconds;
  fpsNumerator: number;
  fpsDenominator: number;
}

export interface SceneResultAdapterOutput {
  durationFrames: number;
  candidates: AutoShotCandidate[];
}

function assertSafeNonNegative(value: number, path: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${path} must be a non-negative safe integer`);
}

function roundDiv(numerator: number, denominator: number): number {
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

function ceilDiv(numerator: number, denominator: number): number {
  return Math.floor((numerator + denominator - 1) / denominator);
}

function durationAndFrame(timestampUs: number, durationUs: number, fpsNumerator: number, fpsDenominator: number) {
  assertSafeNonNegative(timestampUs, "timestampUs");
  assertSafeNonNegative(durationUs, "durationUs");
  if (!Number.isSafeInteger(fpsNumerator) || fpsNumerator <= 0 || !Number.isSafeInteger(fpsDenominator) || fpsDenominator <= 0) throw new Error("fps must be positive safe integers");
  const fpsQ = roundDiv(fpsNumerator * FPS_QUANTIZATION_SCALE, fpsDenominator);
  const frameDenominator = MICROSECONDS_PER_SECOND * FPS_QUANTIZATION_SCALE;
  const durationFrames = Math.max(1, ceilDiv(durationUs * fpsQ, frameDenominator));
  const projected = ceilDiv(timestampUs * fpsQ, frameDenominator);
  return { durationFrames, boundaryFrame: durationFrames <= 1 ? 0 : Math.min(Math.max(projected, 1), durationFrames - 1) };
}

function boundaryOrder(left: SceneBoundary, right: SceneBoundary): number {
  return left.boundary.timestampUs - right.boundary.timestampUs || left.boundary.presentationIndex - right.boundary.presentationIndex || left.id.localeCompare(right.id);
}

function candidateFromBoundary(boundary: SceneBoundary, startFrame: number, endFrame: number, result: SceneEngineResult): AutoShotCandidate {
  const source = boundary.sources[0];
  return {
    id: `${result.configHash}:${boundary.id}:${startFrame}:${endFrame}`,
    kind: boundary.kind,
    startFrame,
    endFrame,
    boundary: boundary.boundary,
    transitionRange: boundary.transitionRange,
    score: source?.score ?? 0,
    threshold: source?.threshold ?? 0,
    detectors: boundary.sources.map(({ detector }) => detector),
    evidence: { ...(source?.evidence ?? {}) },
    engineVersion: result.engineVersion,
    configHash: result.configHash,
  };
}

export function adaptSceneResultToCandidates(input: SceneResultAdapterInput): SceneResultAdapterOutput {
  const duration = durationAndFrame(0, input.durationUs, input.fpsNumerator, input.fpsDenominator);
  const ordered = [...input.result.boundaries].sort(boundaryOrder);
  const unique = new Map<number, { boundary: SceneBoundary; frame: number }>();
  for (const boundary of ordered) {
    const frame = durationAndFrame(boundary.boundary.timestampUs, input.durationUs, input.fpsNumerator, input.fpsDenominator).boundaryFrame;
    if (!unique.has(frame)) unique.set(frame, { boundary, frame });
  }
  const candidates: AutoShotCandidate[] = [];
  let startFrame = 0;
  for (const { boundary, frame } of [...unique.values()].sort((left, right) => left.frame - right.frame || boundaryOrder(left.boundary, right.boundary))) {
    if (frame <= startFrame || frame > duration.durationFrames) continue;
    candidates.push(candidateFromBoundary(boundary, startFrame, frame, input.result));
    startFrame = frame;
  }
  if (startFrame < duration.durationFrames) {
    candidates.push({
      id: `${input.result.configHash}:tail:${startFrame}:${duration.durationFrames}`,
      kind: "tail",
      startFrame,
      endFrame: duration.durationFrames,
      boundary: null,
      transitionRange: null,
      score: 0,
      threshold: 0,
      detectors: [],
      evidence: {},
      engineVersion: input.result.engineVersion,
      configHash: input.result.configHash,
    });
  }
  return { durationFrames: duration.durationFrames, candidates };
}
