import type { AnalysisFieldValue } from "../template/types";

export type ShotStatus = "draft" | "confirmed";

export interface ShotDetectionMeta {
  runId: string | null;
  kind: "hard-cut" | "gradual-transition" | "manual";
  confidence: number | null;
}

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
  analysisFields: Record<string, AnalysisFieldValue>;
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
