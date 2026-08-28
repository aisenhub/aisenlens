import { sceneEngineError } from "./errors.js";
import type { HardCutConfig, SceneDetectionConfig } from "./types.js";

export const DEFAULT_SCENE_DETECTION_CONFIG: SceneDetectionConfig = {
  hardCut: {
    kind: "content",
    threshold: 2700,
    weights: { hue: 3333, saturation: 3333, luma: 3334 },
  },
  fade: null,
  minimumSceneDurationUs: 600_000,
  analysis: { maxWidth: 96, temporalSampling: { kind: "every-frame" } },
  diagnostics: "off",
};

const OBJECT_KEYS = (value: object) => Object.keys(value).sort();
function exactObject(value: unknown, keys: readonly string[], path: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw sceneEngineError("INVALID_CONFIG", `${path} must be an object`);
  }
  const expected = [...keys].sort();
  const actual = OBJECT_KEYS(value);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw sceneEngineError("INVALID_CONFIG", `${path} contains unknown or missing fields`, { path, expected, actual });
  }
}
function integer(value: unknown, path: string, min = 0): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) {
    throw sceneEngineError("INVALID_CONFIG", `${path} must be a safe integer >= ${min}`, { path, value });
  }
}
function finite(value: unknown, path: string, min = 0): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) {
    throw sceneEngineError("INVALID_CONFIG", `${path} must be a finite number >= ${min}`, { path, value });
  }
}
function oneOf<T extends string>(value: unknown, values: readonly T[], path: string): asserts value is T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw sceneEngineError("INVALID_CONFIG", `${path} has an unsupported value`, { path, value, values });
  }
}
function validateWeights(weights: unknown, path: string) {
  exactObject(weights, ["hue", "saturation", "luma"], path);
  const values = weights as Record<string, unknown>;
  for (const key of ["hue", "saturation", "luma"] as const) integer(values[key], `${path}.${key}`);
  if ((values.hue as number) + (values.saturation as number) + (values.luma as number) !== 10_000) {
    throw sceneEngineError("INVALID_CONFIG", `${path} must sum to 10000`);
  }
}
function validateHardCut(value: unknown): asserts value is HardCutConfig {
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof (value as { kind?: unknown }).kind !== "string") {
    throw sceneEngineError("INVALID_CONFIG", "hardCut must use a detector discriminant");
  }
  const kind = (value as { kind: string }).kind;
  if (kind === "content") {
    exactObject(value, ["kind", "threshold", "weights"], "hardCut");
    integer(value.threshold, "hardCut.threshold");
    if (value.threshold > 10_000) throw sceneEngineError("INVALID_CONFIG", "hardCut.threshold must be <= 10000");
    validateWeights(value.weights, "hardCut.weights");
    return;
  }
  if (kind === "adaptive") {
    exactObject(value, ["kind", "adaptiveThreshold", "windowWidth", "minimumContentScore", "weights"], "hardCut");
    integer(value.adaptiveThreshold, "hardCut.adaptiveThreshold", 1);
    integer(value.windowWidth, "hardCut.windowWidth", 1);
    integer(value.minimumContentScore, "hardCut.minimumContentScore");
    if (value.windowWidth > 120) throw sceneEngineError("INVALID_CONFIG", "adaptive windowWidth must be <= 120");
    if (value.minimumContentScore > 10_000) throw sceneEngineError("INVALID_CONFIG", "minimumContentScore must be <= 10000");
    validateWeights(value.weights, "hardCut.weights");
    return;
  }
  throw sceneEngineError("INVALID_CONFIG", "hardCut.kind must be content or adaptive");
}

export function validateSceneDetectionConfig(value: unknown): SceneDetectionConfig {
  exactObject(value, ["hardCut", "fade", "minimumSceneDurationUs", "analysis", "diagnostics"], "config");
  const config = value as Record<string, unknown>;
  validateHardCut(config.hardCut);
  if (config.fade !== null) {
    exactObject(config.fade, ["mode", "threshold", "bias", "emitFinalFade"], "config.fade");
    const fade = config.fade as Record<string, unknown>;
    oneOf(fade.mode, ["floor", "ceiling"], "config.fade.mode");
    integer(fade.threshold, "config.fade.threshold", 0);
    integer(fade.bias, "config.fade.bias");
    if ((fade.threshold as number) > 255 || (fade.bias as number) > 1_000 || (fade.bias as number) < -1_000) throw sceneEngineError("INVALID_CONFIG", "fade threshold must be <= 255 and bias must be within [-1000, 1000]");
    if (typeof fade.emitFinalFade !== "boolean") throw sceneEngineError("INVALID_CONFIG", "config.fade.emitFinalFade must be boolean");
  }
  integer(config.minimumSceneDurationUs, "config.minimumSceneDurationUs");
  exactObject(config.analysis, ["maxWidth", "temporalSampling"], "config.analysis");
  const analysis = config.analysis as Record<string, unknown>;
  integer(analysis.maxWidth, "config.analysis.maxWidth", 1);
  if ((analysis.maxWidth as number) > 4096) throw sceneEngineError("INVALID_CONFIG", "config.analysis.maxWidth must be <= 4096");
  const sampling = analysis.temporalSampling as Record<string, unknown>;
  const samplingKind = sampling && typeof sampling === "object" ? sampling.kind : undefined;
  oneOf(samplingKind, ["every-frame", "stride"], "config.analysis.temporalSampling.kind");
  exactObject(sampling, samplingKind === "stride" ? ["kind", "step", "refineRadiusFrames"] : ["kind"], "config.analysis.temporalSampling");
  if (samplingKind === "stride") {
    integer(sampling.step, "config.analysis.temporalSampling.step", 1);
    integer(sampling.refineRadiusFrames, "config.analysis.temporalSampling.refineRadiusFrames");
  }
  oneOf(config.diagnostics, ["off", "summary", "metrics"], "config.diagnostics");
  return value as unknown as SceneDetectionConfig;
}

export function resolveSceneDetectionConfig(value?: unknown): SceneDetectionConfig {
  return validateSceneDetectionConfig(value ?? structuredClone(DEFAULT_SCENE_DETECTION_CONFIG));
}
