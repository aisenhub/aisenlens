import type { SceneBoundary, SceneEngineResult, SceneEvent, SceneTimePoint } from "../api/types.js";

export interface NormalizeSceneResultInput {
  engineVersion: string;
  configHash: string;
  media: SceneEngineResult["media"];
  events: readonly SceneEvent[];
  diagnostics?: Partial<SceneEngineResult["diagnostics"]>;
}

function point(timestampUs: number, presentationIndex: number, durationUs = 0): SceneTimePoint {
  return { timestampUs, presentationIndex, durationUs };
}

function stableId(event: SceneEvent, configHash: string): string {
  const input = JSON.stringify([
    1,
    event.kind,
    event.detector,
    event.timestampUs,
    event.presentationIndex,
    event.transitionRange,
    configHash,
  ]);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `scene-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function normalizeSceneResult(input: NormalizeSceneResultInput): SceneEngineResult {
  const boundaries: SceneBoundary[] = input.events.map((event) => ({
    id: stableId(event, input.configHash),
    kind: event.kind,
    boundary: point(event.timestampUs, event.presentationIndex),
    transitionRange: event.transitionRange
      ? {
          start: point(event.transitionRange.startUs, event.presentationIndex),
          end: point(event.transitionRange.endUs, event.presentationIndex),
        }
      : null,
    sources: [
      {
        detector: event.detector,
        score: event.score,
        threshold: event.threshold,
        strength: event.strength,
        evidence: { ...event.evidence },
      },
    ],
  }));
  return {
    schemaVersion: 1,
    engineVersion: input.engineVersion,
    configHash: input.configHash,
    media: { ...input.media },
    boundaries,
    diagnostics: {
      backend: input.diagnostics?.backend ?? "wasm-baseline",
      elapsedMs: input.diagnostics?.elapsedMs ?? 0,
      peakWasmBytes: input.diagnostics?.peakWasmBytes ?? 0,
    },
  };
}
