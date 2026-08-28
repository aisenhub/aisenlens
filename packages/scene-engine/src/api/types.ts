/** Public, host-agnostic scene-engine contract.  No C ABI or media-library types leak out. */

export type Microseconds = number;

export type DetectorKind = "content" | "adaptive" | "threshold";
export type SceneBoundaryKind = "hard-cut" | "fade";

export interface SceneTimePoint {
  presentationIndex: number;
  timestampUs: Microseconds;
  durationUs: Microseconds;
}

export interface SceneEvent {
  kind: SceneBoundaryKind;
  detector: DetectorKind;
  timestampUs: Microseconds;
  presentationIndex: number;
  score: number;
  threshold: number;
  evidence: Record<string, number>;
  strength: number | null;
  transitionRange: {
    startUs: Microseconds;
    endUs: Microseconds;
  } | null;
}

export interface SceneBoundary {
  id: string;
  kind: SceneBoundaryKind;
  boundary: SceneTimePoint;
  transitionRange: {
    start: SceneTimePoint;
    end: SceneTimePoint;
  } | null;
  sources: Array<{
    detector: DetectorKind;
    score: number;
    threshold: number;
    strength: number | null;
    evidence: Record<string, number>;
  }>;
}

export interface SceneEngineResult {
  schemaVersion: 1;
  engineVersion: string;
  configHash: string;
  media: {
    durationUs: Microseconds;
    decodedFrames: number;
    codedWidth: number;
    codedHeight: number;
  };
  boundaries: SceneBoundary[];
  diagnostics: {
    backend: "wasm-baseline" | "wasm-simd";
    elapsedMs: number;
    peakWasmBytes: number;
  };
}

export type HardCutConfig =
  | {
      kind: "content";
      threshold: number;
      weights: { hue: number; saturation: number; luma: number };
    }
  | {
      kind: "adaptive";
      adaptiveThreshold: number;
      windowWidth: number;
      minimumContentScore: number;
      weights: { hue: number; saturation: number; luma: number };
    };

export interface SceneDetectionConfig {
  hardCut: HardCutConfig;
  fade: null | {
    mode: "floor" | "ceiling";
    threshold: number;
    bias: number;
    emitFinalFade: boolean;
  };
  minimumSceneDurationUs: Microseconds;
  analysis: {
    maxWidth: number;
    temporalSampling:
      | { kind: "every-frame" }
      | { kind: "stride"; step: number; refineRadiusFrames: number };
  };
  diagnostics: "off" | "summary" | "metrics";
}

/** Alias used by the implementation plan when referring to the public engine config. */
export type EngineConfig = SceneDetectionConfig;

export interface StartSceneDetectionRequest {
  source: Blob;
  mediaFingerprint: string;
  config: SceneDetectionConfig;
  checkpoint?: SceneEngineCheckpoint;
}

export interface SceneEngineCheckpoint {
  schemaVersion: 1;
  engineVersion: string;
  configHash: string;
  mediaFingerprint: string;
  resumeAfter: {
    timestampUs: Microseconds;
    timestampOrdinal: number;
    nextPresentationIndex: number;
  };
  committedBoundaries: SceneBoundary[];
  coreState: ArrayBuffer;
}

export interface SceneEngineProgress {
  processedUs: Microseconds;
  durationUs: Microseconds;
  decodedFrames: number;
  newBoundaries: SceneBoundary[];
  totalBoundaries: number;
}

export type SceneEngineErrorCode =
  | "UNSUPPORTED_CODEC"
  | "WASM_INIT_FAILED"
  | "DECODE_FAILED"
  | "INVALID_CONFIG"
  | "INVALID_FRAME"
  | "INVALID_CHECKPOINT"
  | "CANCELLED"
  | "INTERNAL_ERROR";

export interface SceneEngineError {
  readonly code: SceneEngineErrorCode;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type SceneTaskOutcome =
  | { status: "completed"; result: SceneEngineResult }
  | { status: "paused"; checkpoint: SceneEngineCheckpoint }
  | { status: "cancelled" }
  | { status: "failed"; error: SceneEngineError };

export interface SceneEngineTask {
  readonly jobId: string;
  readonly completion: Promise<SceneTaskOutcome>;
  pause(): Promise<SceneEngineCheckpoint>;
  cancel(): Promise<void>;
}

export interface SceneEngineClient {
  start(
    request: StartSceneDetectionRequest,
    observer?: { onProgress(progress: SceneEngineProgress): void; signal?: AbortSignal },
  ): SceneEngineTask;
  dispose(): Promise<void>;
}
