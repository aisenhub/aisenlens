import type { AnalysisRecord } from "../../analysis/types.ts"
import type { ProjectRecord, StoredShotRecord } from "../../project/types.ts"
import type { TimelineItemReadModel, TimelineReadModel, TimelineTrackDefinition } from "../types.ts"

export interface TimelineReadModelInput {
  project: ProjectRecord
  shots: readonly StoredShotRecord[]
  analysisRecords: readonly AnalysisRecord[]
  trackDefinitions?: readonly TimelineTrackDefinition[]
}

export function buildTimelineReadModel(input: TimelineReadModelInput): TimelineReadModel {
  const tracks: TimelineTrackDefinition[] = input.trackDefinitions ? structuredClone([...input.trackDefinitions]) : [
    { id: "shots", kind: "structure", label: "Shots", source: "shot", defaultHeight: 32, defaultVisible: true, version: 1 },
  ]
  const items: TimelineItemReadModel[] = [...input.shots].sort((a, b) => a.order - b.order).map((shot) => ({
    id: "shot:" + shot.id,
    trackId: "shots",
    range: { startFrame: shot.startFrame, endFrame: shot.endFrame },
    subject: { kind: "shot", id: shot.id },
    label: String(shot.order + 1).padStart(3, "0"),
    status: "normal",
    sourceRevision: shot.structureRevision,
  }))
  for (const record of input.analysisRecords) {
    if (record.subject.kind !== "shot") continue
    const shot = input.shots.find((item) => item.id === record.subject.id)
    if (!shot) continue
    const trackId = "analysis:" + record.fieldId
    if (!tracks.some((track) => track.id === trackId)) {
      tracks.push({ id: trackId, kind: "analysis", label: record.fieldId, source: "analysis", fieldId: record.fieldId, defaultHeight: 24, defaultVisible: false, version: 1 })
    }
    items.push({
      id: "analysis:" + record.id,
      trackId,
      range: { startFrame: shot.startFrame, endFrame: shot.endFrame },
      subject: structuredClone(record.subject),
      label: record.fieldId,
      status: record.status === "stale" ? "stale" : "normal",
      sourceRevision: record.revision,
    })
  }
  return { projectId: input.project.id, structureRevision: input.project.structureRevision, analysisRevision: input.project.analysisRevision, tracks, items }
}
