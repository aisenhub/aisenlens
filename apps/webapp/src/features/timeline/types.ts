import type { AnalysisSubjectRef } from "../analysis/types.ts"

export type FrameIndex = number
export interface FrameRange { startFrame: FrameIndex; endFrame: FrameIndex }

export type TimelineTrackKind = "media" | "structure" | "analysis" | "derived" | "marker"

export interface TimelineTrackDefinition {
  id: string
  kind: TimelineTrackKind
  label: string
  source: "media" | "shot" | "group" | "analysis" | "derived" | "marker"
  fieldId?: string
  defaultHeight: number
  defaultVisible: boolean
  version: number
}

export interface TimelineTrackPreference {
  trackId: string
  visible: boolean
  height: number
  order: number
}

export interface TimelineItemReadModel {
  id: string
  trackId: string
  range: FrameRange
  subject: AnalysisSubjectRef | null
  label: string
  status: "normal" | "stale" | "candidate" | "derived"
  sourceRevision: string | number | null
}

export interface TimelineReadModel {
  projectId: string
  structureRevision: number
  analysisRevision: string | number | null
  tracks: TimelineTrackDefinition[]
  items: TimelineItemReadModel[]
}
