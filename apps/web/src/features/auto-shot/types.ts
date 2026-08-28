import type {
  Microseconds,
  SceneDetectionConfig,
  SceneEngineCheckpoint,
  SceneEngineError,
  SceneEngineResult,
  SceneTimePoint,
} from "@aisenlens/scene-engine";
import type { MediaSourceFingerprint } from "../project/types";

export type AutoShotTaskStatus = "running" | "paused" | "completed" | "failed" | "cancelled";

export interface AutoShotCandidate {
  id: string;
  kind: "hard-cut" | "fade" | "tail";
  startFrame: number;
  endFrame: number;
  boundary: SceneTimePoint | null;
  transitionRange: { start: SceneTimePoint; end: SceneTimePoint } | null;
  score: number;
  threshold: number;
  detectors: string[];
  evidence: Record<string, number>;
  engineVersion: string;
  configHash: string;
}

export interface AutoShotProgress {
  processedUs: Microseconds;
  durationUs: Microseconds;
  decodedFrames: number;
  candidateCount: number;
}

/** Web business record; it intentionally does not mirror the engine C ABI. */
export interface AutoShotTaskRecord {
  id: string;
  projectId: string;
  mediaFingerprint: MediaSourceFingerprint;
  config: SceneDetectionConfig;
  status: AutoShotTaskStatus;
  engineVersion: string | null;
  configHash: string | null;
  progress: AutoShotProgress;
  candidates: AutoShotCandidate[];
  checkpoint: SceneEngineCheckpoint | null;
  result: SceneEngineResult | null;
  error: SceneEngineError | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutoShotTaskRepository {
  getAutoShotTask(projectId: string, mediaFingerprint: MediaSourceFingerprint): Promise<AutoShotTaskRecord | null>;
  saveAutoShotTask(task: AutoShotTaskRecord): Promise<void>;
  deleteAutoShotTask(projectId: string): Promise<void>;
}
