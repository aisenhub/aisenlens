import assert from "node:assert/strict";
import test from "node:test";
import { addUncertainRange, scoreHardCuts, updateHardCutAnnotation, validateCalibrationManifests } from "../src/features/scene-calibration/services/calibrationService.ts";
import type { CalibrationAnnotationRecord, CalibrationManifest, CalibrationManifestEntry } from "../src/features/scene-calibration/types.ts";

const identity = {
  identitySchema: "aisenlens-auto-shot-media-identity" as const,
  schemaVersion: 1 as const,
  contentDigestStrategy: "sha256-file-v1" as const,
  contentDigest: "a".repeat(64),
  size: 10,
  codec: "avc1",
  codedWidth: 1920,
  codedHeight: 1080,
  displayWidth: 1920,
  displayHeight: 1080,
  rotation: 0 as const,
  durationUs: 10_000_000,
  mediaIdentityDigest: "b".repeat(64),
};

function annotation(split: "search" | "holdout", fixtureId: string, workId = fixtureId): CalibrationAnnotationRecord {
  return {
    schemaVersion: 1,
    annotationId: `annotation:${fixtureId}`,
    fixtureId,
    split,
    source: { workId, name: fixtureId, url: `local://${fixtureId}`, acquiredAt: "2026-08-29", license: "test" },
    media: { container: "mp4", codec: "avc1", codedWidth: 1920, codedHeight: 1080, displayWidth: 1920, displayHeight: 1080, rotation: 0, durationUs: 10_000_000, fpsNumerator: 30, fpsDenominator: 1 },
    mediaIdentity: identity,
    sha256: identity.contentDigest,
    annotator: "tester",
    reviewer: "reviewer",
    reviewStatus: "reviewed",
    hardCuts: [{ id: "cut-1", timestampUs: 3_000_000, frame: 90, confidence: "confirmed", source: "manual" }],
    uncertainRanges: [],
    researchRun: null,
    updatedAt: "2026-08-29T00:00:00.000Z",
  };
}

function entry(split: "search" | "holdout", fixtureId: string, workId = fixtureId): CalibrationManifestEntry {
  const current = annotation(split, fixtureId, workId);
  return { fixtureId, split, path: `local/${fixtureId}.mp4`, source: current.source, media: current.media, sha256: current.sha256, annotation: current };
}

function manifest(split: "search" | "holdout", fixtureId: string, workId = fixtureId): CalibrationManifest {
  return { schemaVersion: 1, manifestKind: "scene-calibration", datasetVersion: "test-v1", matching: { hardCutToleranceFrames: [0, 1, 2], oneToOne: true }, fixtures: [entry(split, fixtureId, workId)] };
}

test("人工标注支持接受候选、手工边界和不确定范围，且不改写镜头", () => {
  const current = annotation("search", "fixture-1");
  const candidate = { id: "candidate-1", kind: "hard-cut" as const, startFrame: 90, endFrame: 120, boundary: { timestampUs: 3_000_000 }, transitionRange: null, score: 1, threshold: 1, detectors: ["adaptive"], evidence: {}, engineVersion: "test", configHash: "test" };
  const accepted = updateHardCutAnnotation(current, "accept", { candidate });
  assert.equal(accepted.hardCuts.length, 2);
  const withRange = addUncertainRange(accepted, { startUs: 4_000_000, endUs: 4_100_000, reason: "快速运动" });
  assert.equal(withRange.uncertainRanges.length, 1);
  const moved = updateHardCutAnnotation(withRange, "move", { id: "cut-1", timestampUs: 3_100_000, frame: 93 });
  assert.equal(moved.hardCuts.find((cut) => cut.id === "cut-1")?.frame, 93);
});

test("hard-cut 评分遵守一对一匹配并输出偏移与误报率", () => {
  const score = scoreHardCuts([
    { id: "p1", frame: 91, timestampUs: 3_033_333 },
    { id: "p2", frame: 200, timestampUs: 6_666_666 },
  ], annotation("search", "fixture-1").hardCuts, 10_000_000, 2);
  assert.equal(score.matchedCount, 1);
  assert.equal(score.truthCount, 1);
  assert.equal(score.predictedCount, 2);
  assert.equal(score.meanAbsoluteOffsetFrames, 1);
  assert.equal(score.falsePositivesPerMinute, 6);
});

test("manifest 校验拒绝 search/holdout 来源泄漏和未解决分歧", () => {
  const search = manifest("search", "fixture-search", "same-work");
  const holdout = manifest("holdout", "fixture-holdout", "same-work");
  holdout.fixtures[0].source.url = search.fixtures[0].source.url;
  holdout.fixtures[0].annotation.source.url = search.fixtures[0].source.url;
  holdout.fixtures[0].annotation.reviewStatus = "disputed";
  const issues = validateCalibrationManifests(search, holdout);
  assert.ok(issues.some((item) => item.code === "SPLIT_LEAKAGE"));
  assert.ok(issues.some((item) => item.code === "UNRESOLVED_DISPUTE"));
});
