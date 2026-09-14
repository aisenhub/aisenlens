import type { SceneDetectionConfig } from "@aisenlens/scene-engine";
import type { AutoShotMediaIdentity } from "../auto-shot/mediaIdentity";
import type { AutoShotCandidate } from "../auto-shot/types";
import type { ResolvedAutoShotConfiguration } from "../auto-shot/config/types";

export type CalibrationSplit = "search" | "holdout";
export type CalibrationReviewStatus = "unreviewed" | "reviewed" | "disputed";
export type CalibrationBoundaryConfidence = "confirmed" | "uncertain";
export type CalibrationCandidateReviewStatus = "accepted" | "rejected" | "corrected";

export interface CalibrationSource {
  workId: string;
  name: string;
  url: string;
  acquiredAt: string;
  license: string;
}

export interface CalibrationMediaDescriptor {
  container: string;
  codec: string;
  codedWidth: number;
  codedHeight: number;
  displayWidth: number;
  displayHeight: number;
  rotation: 0 | 90 | 180 | 270;
  durationUs: number;
  fpsNumerator: number;
  fpsDenominator: number;
}

export interface CalibrationHardCut {
  id: string;
  timestampUs: number;
  frame: number;
  confidence: CalibrationBoundaryConfidence;
  source: "candidate" | "manual";
  candidateId?: string;
  note?: string;
}

export interface CalibrationUncertainRange {
  id: string;
  startUs: number;
  endUs: number;
  reason: string;
}

export interface CalibrationRunSnapshot {
  presetId: string;
  presetVersion: number;
  catalog: "research";
  detail: string;
  config: SceneDetectionConfig;
  canonicalConfig: string;
  configHash: string;
  engineVersion: string;
  candidateIds: string[];
}

export interface CalibrationAnnotationRecord {
  schemaVersion: 1;
  annotationId: string;
  projectId: string;
  fixtureId: string;
  split: CalibrationSplit;
  source: CalibrationSource;
  media: CalibrationMediaDescriptor;
  mediaIdentity: AutoShotMediaIdentity;
  sha256: string;
  annotator: string;
  reviewer: string | null;
  reviewStatus: CalibrationReviewStatus;
  hardCuts: CalibrationHardCut[];
  /** Candidate disposition is kept separately from truth, so rejected candidates remain auditable. */
  candidateReviews: Record<string, CalibrationCandidateReviewStatus>;
  uncertainRanges: CalibrationUncertainRange[];
  researchRun: CalibrationRunSnapshot | null;
  updatedAt: string;
}

export interface CalibrationManifestEntry {
  fixtureId: string;
  split: CalibrationSplit;
  path: string;
  source: CalibrationSource;
  media: CalibrationMediaDescriptor;
  sha256: string;
  annotation: CalibrationAnnotationRecord;
}

export interface CalibrationManifest {
  schemaVersion: 1;
  manifestKind: "scene-calibration";
  datasetVersion: string;
  matching: { hardCutToleranceFrames: readonly number[]; oneToOne: true };
  fixtures: CalibrationManifestEntry[];
}

export interface CalibrationValidationIssue {
  code: "INVALID_SCHEMA" | "DUPLICATE_FIXTURE" | "SPLIT_LEAKAGE" | "IDENTITY_MISMATCH" | "CHECKSUM_MISMATCH" | "INSUFFICIENT_SAMPLES" | "UNRESOLVED_DISPUTE" | "INVALID_BOUNDARY";
  path: string;
  message: string;
}

export interface HardCutPrediction {
  id: string;
  frame: number;
  timestampUs: number;
  score?: number;
}

export interface HardCutScore {
  predictedCount: number;
  truthCount: number;
  matchedCount: number;
  precision: number;
  recall: number;
  f1: number;
  meanAbsoluteOffsetFrames: number | null;
  p95AbsoluteOffsetFrames: number | null;
  falsePositivesPerMinute: number;
}

export interface SearchSweepCandidate {
  id: string;
  resolved: ResolvedAutoShotConfiguration;
}

export interface SearchSweepResult {
  split: "search";
  datasetVersion: string;
  datasetChecksum: string;
  candidates: Array<{ id: string; configHash: string; canonicalConfig: string; score: HardCutScore }>;
}

export interface CalibrationCandidateView {
  candidate: AutoShotCandidate;
  accepted: boolean;
}
