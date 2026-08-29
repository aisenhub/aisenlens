import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SCENE_DETECTION_CONFIG, canonicalizeSceneDetectionConfig, hashSceneDetectionConfig } from "../src/index.js";

test("canonical config is independent of object field insertion order", () => {
  const first = {
    hardCut: { kind: "content" as const, threshold: 2700, weights: { hue: 3333, saturation: 3333, luma: 3334 } },
    fade: null,
    minimumSceneDurationUs: 600_000,
    analysis: { maxWidth: 96, temporalSampling: { kind: "every-frame" as const } },
    diagnostics: "off" as const,
  };
  const second = {
    diagnostics: "off" as const,
    analysis: { temporalSampling: { kind: "every-frame" as const }, maxWidth: 96 },
    minimumSceneDurationUs: 600_000,
    fade: null,
    hardCut: { weights: { luma: 3334, saturation: 3333, hue: 3333 }, threshold: 2700, kind: "content" as const },
  };
  assert.equal(canonicalizeSceneDetectionConfig(first), canonicalizeSceneDetectionConfig(second));
  assert.equal(hashSceneDetectionConfig(first).text, hashSceneDetectionConfig(second).text);
});

test("canonical config uses the frozen array encoding and 64-bit FNV-1a label", () => {
  const hash = hashSceneDetectionConfig(DEFAULT_SCENE_DETECTION_CONFIG);
  assert.match(hash.text, /^fnv1a64-v1:[0-9a-f]{16}$/);
  assert.equal(hash.value >= 0n, true);
  assert.match(canonicalizeSceneDetectionConfig(DEFAULT_SCENE_DETECTION_CONFIG), /^\["aisenlens-scene-config",1,/);
});

test("different valid configs have different canonical snapshots", () => {
  const config = structuredClone(DEFAULT_SCENE_DETECTION_CONFIG);
  config.minimumSceneDurationUs += 1;
  assert.notEqual(hashSceneDetectionConfig(config).text, hashSceneDetectionConfig(DEFAULT_SCENE_DETECTION_CONFIG).text);
});
