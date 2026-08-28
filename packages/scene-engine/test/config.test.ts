import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SCENE_DETECTION_CONFIG, resolveSceneDetectionConfig, validateSceneDetectionConfig } from "../src/api/config.js";

test("default config is valid and does not mutate the exported default", () => {
  const config = resolveSceneDetectionConfig();
  assert.deepEqual(config, DEFAULT_SCENE_DETECTION_CONFIG);
  assert.notEqual(config, DEFAULT_SCENE_DETECTION_CONFIG);
});

test("rejects unknown fields and invalid detector combinations", () => {
  const unknown = { ...DEFAULT_SCENE_DETECTION_CONFIG, extra: true };
  assert.throws(() => validateSceneDetectionConfig(unknown), { code: "INVALID_CONFIG" });
  assert.throws(
    () => validateSceneDetectionConfig({ ...DEFAULT_SCENE_DETECTION_CONFIG, hardCut: { kind: "threshold" } }),
    { code: "INVALID_CONFIG" },
  );
});

test("requires fixed-point weights to sum to the C++ scale", () => {
  const invalid = {
    ...DEFAULT_SCENE_DETECTION_CONFIG,
    hardCut: { kind: "content" as const, threshold: 2700, weights: { hue: 1, saturation: 1, luma: 1 } },
  };
  assert.throws(() => validateSceneDetectionConfig(invalid), { code: "INVALID_CONFIG" });
});
