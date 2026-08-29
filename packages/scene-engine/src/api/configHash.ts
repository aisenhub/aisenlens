import type { SceneDetectionConfig } from "./types.js";

const FNV_OFFSET_BASIS_64 = 14695981039346656037n;
const FNV_PRIME_64 = 1099511628211n;
const UINT64_MASK = 0xffffffffffffffffn;

export interface SceneConfigHash {
  canonical: string;
  text: `fnv1a64-v1:${string}`;
  value: bigint;
}

/**
 * Returns the versioned, insertion-order-independent wire representation of a
 * scene configuration. Validation happens before encoding so malformed values
 * can never acquire a resumable hash.
 */
export function canonicalizeSceneDetectionConfig(value: SceneDetectionConfig): string {
  // Callers resolve/validate the public config before hashing. Keeping this
  // serializer free of runtime imports also lets the Web task service use the
  // exact same implementation in its Node contract tests.
  const config = value;
  const hardCut = config.hardCut.kind === "content"
    ? ["content", config.hardCut.threshold, config.hardCut.weights.hue, config.hardCut.weights.saturation, config.hardCut.weights.luma]
    : ["adaptive", config.hardCut.adaptiveThreshold, config.hardCut.windowWidth, config.hardCut.minimumContentScore, config.hardCut.weights.hue, config.hardCut.weights.saturation, config.hardCut.weights.luma];
  const fade = config.fade === null
    ? null
    : [config.fade.mode, config.fade.threshold, config.fade.bias, config.fade.emitFinalFade ? 1 : 0];
  const analysis = config.analysis.temporalSampling.kind === "every-frame"
    ? [config.analysis.maxWidth, ["every-frame"]]
    : [config.analysis.maxWidth, ["stride", config.analysis.temporalSampling.step, config.analysis.temporalSampling.refineRadiusFrames]];
  return JSON.stringify([
    "aisenlens-scene-config",
    1,
    hardCut,
    fade,
    config.minimumSceneDurationUs,
    analysis,
    config.diagnostics,
  ]);
}

function fnv1a64(bytes: Uint8Array): bigint {
  let hash = FNV_OFFSET_BASIS_64;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME_64) & UINT64_MASK;
  }
  return hash;
}

export function hashSceneDetectionConfig(value: SceneDetectionConfig): SceneConfigHash {
  const canonical = canonicalizeSceneDetectionConfig(value);
  const valueHash = fnv1a64(new TextEncoder().encode(canonical));
  return {
    canonical,
    value: valueHash,
    text: `fnv1a64-v1:${valueHash.toString(16).padStart(16, "0")}`,
  };
}
