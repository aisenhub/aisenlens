import type { AutoShotCandidate, AutoShotTaskRecord } from "../auto-shot/types"
import type { AutoShotMediaIdentity } from "../auto-shot/mediaIdentity"
import type { MediaSourceFingerprint, StoredShotRecord } from "../project/types"

export const CALIBRATION_DRAFT_SCHEMA_VERSION = 3 as const
export const CALIBRATION_HISTORY_LIMIT = 100

export type CalibrationDraftStatus = "editing" | "applying" | "applied" | "conflict"
export type CalibrationBoundarySource = "detected" | "manual"
export type CalibrationIssueStatus = "pending" | "resolved"
export type CalibrationReviewKind = "playback" | "explicit"

export interface CalibrationTimebase {
  kind: "frame"
  timingMode: "cfr" | "vfr"
  frameRate: number
  totalFrames: number
  exact: boolean
  presentationTimestamps: number[]
  presentationDurations: number[]
}

export interface CalibrationBoundary {
  id: string
  frame: number
  source: CalibrationBoundarySource
  candidateId: string | null
  originalFrame: number | null
  wasManuallyAdjusted: boolean
  transitionRange: AutoShotCandidate["transitionRange"]
}

export interface CalibrationSegment {
  id: string
  startBoundaryId: string | null
  endBoundaryId: string | null
  startFrame: number
  endFrame: number
  sourceShotId: string | null
  sourceCandidateId: string | null
}

export interface CalibrationReviewRange {
  id: string
  startFrame: number
  endFrame: number
  kind: CalibrationReviewKind
  createdAt: string
}

export interface CalibrationReviewIssue {
  id: string
  frame: number
  endFrame: number | null
  note: string
  status: CalibrationIssueStatus
  createdAt: string
  updatedAt: string
}

export interface CalibrationApplyReceipt {
  draftId: string
  appliedDraftRevision: number
  projectUpdatedAt: string
  appliedAt: string
  recoverySnapshotId: string
}

export interface CalibrationDraft {
  schemaVersion: typeof CALIBRATION_DRAFT_SCHEMA_VERSION
  id: string
  projectId: string
  mediaIdentity: AutoShotMediaIdentity
  mediaSource: MediaSourceFingerprint | null
  timebase: CalibrationTimebase
  baseProjectUpdatedAt: string
  baseTaskId: string | null
  baseTaskUpdatedAt: string | null
  baseFormalShotsSignature: string
  initialSource: "detection" | "formal-shots"
  revision: number
  status: CalibrationDraftStatus
  boundaries: CalibrationBoundary[]
  segments: CalibrationSegment[]
  reviewRanges: CalibrationReviewRange[]
  issues: CalibrationReviewIssue[]
  applyReceipt: CalibrationApplyReceipt | null
  createdAt: string
  updatedAt: string
}

export type CalibrationCommand =
  | { type: "splitAtFrame"; frame: number; expectedRevision: number }
  | { type: "moveBoundary"; boundaryId: string; frame: number; expectedRevision: number }
  | { type: "removeBoundary"; boundaryId: string; expectedRevision: number }
  | { type: "addReviewIssue"; frame: number; endFrame?: number | null; note?: string; expectedRevision: number }
  | { type: "resolveIssue"; issueId: string; expectedRevision: number }
  | { type: "addReviewRange"; startFrame: number; endFrame: number; kind: CalibrationReviewKind; expectedRevision: number }

export type CalibrationCommandInput = {
  [Type in CalibrationCommand["type"]]: Omit<Extract<CalibrationCommand, { type: Type }>, "expectedRevision">
}[CalibrationCommand["type"]]

export interface CalibrationDraftRecord extends CalibrationDraft {
  projectMediaKey: [string, string]
}

export interface CalibrationDraftSeed {
  projectId: string
  mediaIdentity: AutoShotMediaIdentity
  mediaSource: MediaSourceFingerprint | null
  frameRate: number
  totalFrames: number
  timingMode?: "cfr" | "vfr"
  presentationTimestamps?: readonly number[]
  presentationDurations?: readonly number[]
  baseProjectUpdatedAt: string
  task: AutoShotTaskRecord | null
  shots: readonly StoredShotRecord[]
}

export interface CalibrationCommandResult {
  draft: CalibrationDraft
  changed: boolean
  affectedFrames: { startFrame: number; endFrame: number }
}
