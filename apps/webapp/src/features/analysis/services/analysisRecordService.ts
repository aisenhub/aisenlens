import type { AnalysisFieldEntry, ProjectAnalysisProfileSnapshot } from "../../template/types.ts"
import type { ShotGroupRecord } from "../../group/types.ts"
import type { StoredShotRecord } from "../../project/types.ts"
import type {
  AnalysisCandidate,
  AnalysisContextManifest,
  AnalysisDependencyRevision,
  AnalysisEligibility,
  AnalysisEvidenceRecord,
  AnalysisFieldDefinition,
  AnalysisRecord,
  AnalysisSubjectRef,
} from "../types.ts"

export const SHOT_DESCRIPTION_FIELD_ID = "shot_description"
export const SHOT_NOTES_FIELD_ID = "shot_notes"

export function analysisRecordId(projectId: string, subject: AnalysisSubjectRef, fieldId: string): string {
  return [projectId, subject.kind, subject.id, fieldId].join(":")
}

function sameEntry(left: AnalysisFieldEntry, right: AnalysisFieldEntry): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function textEntry(value: string): AnalysisFieldEntry | null {
  return value.trim() ? { state: "set", value } : null
}

export function buildShotAnalysisRecords(input: {
  projectId: string
  entriesByShotId: Record<string, Record<string, AnalysisFieldEntry>>
  notesByShotId: Record<string, { content: string; analysis: string }>
  existingRecords: readonly AnalysisRecord[]
  activeShotIds: readonly string[]
  profile: ProjectAnalysisProfileSnapshot | null
  structureRevision: number
  now?: string
}): AnalysisRecord[] {
  const now = input.now ?? new Date().toISOString()
  const active = new Set(input.activeShotIds)
  const managedFields = new Set([
    ...(input.profile?.fieldDefinitions.map((field) => field.fieldId) ?? []),
    SHOT_DESCRIPTION_FIELD_ID,
    SHOT_NOTES_FIELD_ID,
  ])
  const output = new Map(
    input.existingRecords
      .filter((record) => record.projectId === input.projectId)
      .filter((record) => record.subject.kind !== "shot" || !active.has(record.subject.id) || !managedFields.has(record.fieldId))
      .map((record) => [record.id, structuredClone(record)]),
  )

  for (const shotId of input.activeShotIds) {
    const entries: Record<string, AnalysisFieldEntry> = structuredClone(input.entriesByShotId[shotId] ?? {})
    const notes = input.notesByShotId[shotId]
    const description = textEntry(notes?.content ?? "")
    const analysisNotes = textEntry(notes?.analysis ?? "")
    if (description) entries[SHOT_DESCRIPTION_FIELD_ID] = description
    else delete entries[SHOT_DESCRIPTION_FIELD_ID]
    if (analysisNotes) entries[SHOT_NOTES_FIELD_ID] = analysisNotes
    else delete entries[SHOT_NOTES_FIELD_ID]

    for (const [fieldId, entry] of Object.entries(entries)) {
      const subject: AnalysisSubjectRef = { kind: "shot", id: shotId }
      const id = analysisRecordId(input.projectId, subject, fieldId)
      const existing = input.existingRecords.find((record) => record.id === id)
      if (existing && sameEntry(existing.entry, entry)) {
        output.set(id, structuredClone(existing))
        continue
      }
      output.set(id, {
        id,
        projectId: input.projectId,
        subject,
        fieldId,
        entry: structuredClone(entry),
        status: "confirmed",
        staleReason: null,
        provenance: {
          kind: "user",
          definitionVersion: input.profile?.fieldDefinitions.find((field) => field.fieldId === fieldId)?.definitionVersion,
          profileVersion: input.profile?.version,
          confirmedAt: now,
        },
        evidenceRefs: existing?.evidenceRefs ?? [],
        structureRevision: input.structureRevision,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        revision: (existing?.revision ?? 0) + 1,
      })
    }
  }

  return [...output.values()].sort((left, right) => left.id.localeCompare(right.id))
}

export function analysisEntriesByShotId(
  records: readonly AnalysisRecord[],
  options: { includeStale?: boolean; includeNoteFields?: boolean } = {},
): Record<string, Record<string, AnalysisFieldEntry>> {
  const result: Record<string, Record<string, AnalysisFieldEntry>> = {}
  for (const record of records) {
    if (record.subject.kind !== "shot") continue
    if (record.status === "stale" && options.includeStale === false) continue
    if (options.includeNoteFields !== true && (record.fieldId === SHOT_DESCRIPTION_FIELD_ID || record.fieldId === SHOT_NOTES_FIELD_ID)) continue
    result[record.subject.id] ??= {}
    result[record.subject.id][record.fieldId] = structuredClone(record.entry)
  }
  return result
}

export function shotNotesByShotId(records: readonly AnalysisRecord[]): Record<string, { content: string; analysis: string }> {
  const result: Record<string, { content: string; analysis: string }> = {}
  for (const record of records) {
    if (record.subject.kind !== "shot" || (record.fieldId !== SHOT_DESCRIPTION_FIELD_ID && record.fieldId !== SHOT_NOTES_FIELD_ID)) continue
    result[record.subject.id] ??= { content: "", analysis: "" }
    const value = record.entry.state === "set" && typeof record.entry.value === "string" ? record.entry.value : ""
    if (record.fieldId === SHOT_DESCRIPTION_FIELD_ID) result[record.subject.id].content = value
    else result[record.subject.id].analysis = value
  }
  return result
}

function shotShapeChanged(previous: StoredShotRecord | undefined, next: StoredShotRecord | undefined): string | null {
  if (!next) return "shot-identity-removed"
  if (!previous) return null
  if (previous.startFrame !== next.startFrame || previous.endFrame !== next.endFrame) return "shot-range-changed"
  return null
}

function groupShapeChanged(previous: ShotGroupRecord | undefined, next: ShotGroupRecord | undefined): string | null {
  if (!next) return "structure-identity-removed"
  if (!previous) return null
  if (previous.kind !== next.kind || JSON.stringify(previous.shotIds) !== JSON.stringify(next.shotIds)) return "structure-membership-changed"
  return null
}

function subjectStaleReason(
  subject: AnalysisSubjectRef,
  previousShots: Map<string, StoredShotRecord>,
  nextShots: Map<string, StoredShotRecord>,
  previousGroups: Map<string, ShotGroupRecord>,
  nextGroups: Map<string, ShotGroupRecord>,
): string | null {
  if (subject.kind === "shot") return shotShapeChanged(previousShots.get(subject.id), nextShots.get(subject.id))
  if (subject.kind === "scene" || subject.kind === "sequence" || subject.kind === "section") return groupShapeChanged(previousGroups.get(subject.id), nextGroups.get(subject.id))
  return null
}

export function reconcileAnalysisAfterStructureChange(input: {
  records: readonly AnalysisRecord[]
  candidates: readonly AnalysisCandidate[]
  evidence: readonly AnalysisEvidenceRecord[]
  previousShots: readonly StoredShotRecord[]
  nextShots: readonly StoredShotRecord[]
  previousGroups?: readonly ShotGroupRecord[]
  nextGroups?: readonly ShotGroupRecord[]
  invalidatedByRevision: number
  now?: string
}): { records: AnalysisRecord[]; candidates: AnalysisCandidate[]; evidence: AnalysisEvidenceRecord[] } {
  const now = input.now ?? new Date().toISOString()
  const previousShots = new Map(input.previousShots.map((shot) => [shot.id, shot]))
  const nextShots = new Map(input.nextShots.map((shot) => [shot.id, shot]))
  const previousGroups = new Map((input.previousGroups ?? []).map((group) => [group.id, group]))
  const nextGroups = new Map((input.nextGroups ?? []).map((group) => [group.id, group]))

  const records = input.records.map((record) => {
    const reason = subjectStaleReason(record.subject, previousShots, nextShots, previousGroups, nextGroups)
    if (!reason || record.status === "stale") return structuredClone(record)
    return { ...structuredClone(record), status: "stale" as const, staleReason: reason + "@" + input.invalidatedByRevision, updatedAt: now, revision: record.revision + 1 }
  })
  const candidates = input.candidates.map((candidate) => {
    const reason = subjectStaleReason(candidate.subject, previousShots, nextShots, previousGroups, nextGroups)
    if (!reason || candidate.status !== "pending") return structuredClone(candidate)
    return { ...structuredClone(candidate), status: "stale" as const, updatedAt: now, revision: candidate.revision + 1 }
  })
  const staleRecordIds = new Set(records.filter((record) => record.status === "stale").map((record) => record.id))
  const staleCandidateIds = new Set(candidates.filter((candidate) => candidate.status === "stale").map((candidate) => candidate.id))
  const evidence = input.evidence.map((item) => {
    const refShotId = item.ref.kind === "shot" ? item.ref.shotId : null
    const refStale = Boolean(refShotId && !nextShots.has(refShotId))
    const boundStale = Boolean((item.recordId && staleRecordIds.has(item.recordId)) || (item.candidateId && staleCandidateIds.has(item.candidateId)))
    if ((!refStale && !boundStale) || item.status === "stale") return structuredClone(item)
    return { ...structuredClone(item), status: "stale" as const, staleReason: refStale ? "evidence-shot-removed" : "bound-analysis-stale", updatedAt: now, revision: item.revision + 1 }
  })
  return { records, candidates, evidence }
}

export function getAnalysisEligibility(
  record: AnalysisRecord,
  definition: AnalysisFieldDefinition | null,
  evidence: readonly AnalysisEvidenceRecord[],
): AnalysisEligibility {
  const reasons: string[] = []
  if (record.status !== "confirmed") reasons.push("record-stale")
  if (definition?.evidencePolicy === "required" && !record.evidenceRefs.some((id) => evidence.some((item) => item.id === id && item.status === "valid"))) reasons.push("required-evidence-missing")
  return { eligible: reasons.length === 0, reasons }
}

export function getAnalysisContextManifestStaleReason(
  manifest: Pick<AnalysisContextManifest, "dependencyRevision">,
  currentRevision: AnalysisDependencyRevision,
): string | null {
  if (manifest.dependencyRevision.structureRevision !== currentRevision.structureRevision) return "context-structure-revision-changed"
  if (manifest.dependencyRevision.analysisRevision !== currentRevision.analysisRevision) return "context-analysis-revision-changed"
  return null
}
