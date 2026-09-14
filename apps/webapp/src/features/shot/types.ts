import type { AnalysisFieldEntry } from "../template/types";

export type ShotStatus = "draft" | "confirmed";

export type ShotDetectionMeta =
  | { source: "manual" }
  | {
      source: "auto-shot";
      taskId: string;
      candidateId: string;
      kind: "hard-cut" | "fade" | "tail";
      mediaIdentityDigest: string;
      presetId: string;
      presetVersion: number;
      engineVersion: string;
      configHash: string;
    };

export interface ShotRecord {
  id: string;
  projectId: string;
  order: number;
  startFrame: number;
  endFrame: number;
  status: ShotStatus;
  detection: ShotDetectionMeta | null;
  primaryScreenshotId: string | null;
  screenshotIds: string[];
  firstFrameScreenshotId: string | null;
  lastFrameScreenshotId: string | null;
  analysisFields: Record<string, AnalysisFieldEntry>;
  description: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShotFrameRange {
  id: string;
  startFrame: number;
  endFrame: number;
}
