import type { AnalysisEvidenceRecord, AnalysisRecord } from "../../analysis/types.ts"
import { analysisFieldDefinitionFromSnapshot } from "../../analysis/types.ts"
import { getAnalysisEligibility } from "../../analysis/services/analysisRecordService.ts"
import type { ProjectRecord, StoredShotRecord } from "../../project/types.ts"
import type { ProjectAnalysisProfileSnapshot } from "../../template/types.ts"
import type { ResultCell, ResultRow, ResultsDataset } from "../types.ts"

export interface ResultsDatasetQuery {
  project: ProjectRecord
  shots: readonly StoredShotRecord[]
  analysisRecords: readonly AnalysisRecord[]
  analysisEvidence: readonly AnalysisEvidenceRecord[]
  profile: ProjectAnalysisProfileSnapshot | null
  includeStale?: boolean
}

export function buildResultsDataset(input: ResultsDatasetQuery): ResultsDataset {
  const definitions = new Map((input.profile?.fieldDefinitions ?? []).map((definition) => [definition.fieldId, definition]))
  const usages = new Map((input.profile?.fieldUsages ?? []).map((usage) => [usage.fieldId, usage]))
  const recordsByShot = new Map<string, AnalysisRecord[]>()
  for (const record of input.analysisRecords) {
    if (record.subject.kind !== "shot") continue
    const list = recordsByShot.get(record.subject.id) ?? []
    list.push(record)
    recordsByShot.set(record.subject.id, list)
  }
  const rows: ResultRow[] = [...input.shots].sort((a, b) => a.order - b.order).map((shot) => {
    const cells: ResultCell[] = (recordsByShot.get(shot.id) ?? [])
      .filter((record) => {
        const definition = definitions.get(record.fieldId)
        const domainDefinition = definition ? analysisFieldDefinitionFromSnapshot(definition, usages.get(record.fieldId)) : null
        const eligibility = getAnalysisEligibility(record, domainDefinition, input.analysisEvidence)
        return eligibility.eligible || (input.includeStale === true && record.status === "stale")
      })
      .map((record) => ({
        fieldId: record.fieldId,
        entry: structuredClone(record.entry),
        status: record.status,
        provenance: structuredClone(record.provenance),
        evidenceRefs: [...record.evidenceRefs],
      }))
    return { subjectId: shot.id, subjectKind: "shot", startFrame: shot.startFrame, endFrame: shot.endFrame, cells }
  })
  return {
    projectId: input.project.id,
    structureRevision: input.project.structureRevision,
    analysisRevision: input.project.analysisRevision,
    profileId: input.profile?.id ?? null,
    profileVersion: input.profile?.version ?? null,
    rows,
  }
}
