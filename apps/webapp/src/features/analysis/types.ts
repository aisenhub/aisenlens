import type { RuntimeRevision } from "../../types/runtime.ts"
import type { AnalysisFieldEntry, AnalysisProfileFieldUsage, FieldDefinitionSnapshot } from "../template/types.ts"

export type ResearchTarget =
  | { kind: "shot"; id: string }
  | { kind: "group"; id: string }
  | { kind: "range"; id: string }

export type ResearchStatus = "not-started" | "in-progress" | "completed"

export interface ResearchRange {
  id: string
  projectId: string
  mediaIdentityDigest: string
  startUs: number
  endUs: number
  title: string
  observation: string
  interpretation: string
  summary: string
  createdAt: string
  updatedAt: string
  revision: number
}

export type EvidenceRef =
  | { id: string; kind: "screenshot"; projectId: string; mediaIdentityDigest: string; screenshotId: string }
  | { id: string; kind: "shot"; projectId: string; mediaIdentityDigest: string; shotId: string }
  | { id: string; kind: "frame"; projectId: string; mediaIdentityDigest: string; frame: number }
  | { id: string; kind: "range"; projectId: string; mediaIdentityDigest: string; startFrame: number; endFrame: number }
  | { id: string; kind: "dialogue"; projectId: string; mediaIdentityDigest: string; dialogueId?: string; startUs?: number; endUs?: number; text?: string }
  | { id: string; kind: "statistic"; projectId: string; mediaIdentityDigest: string; metric: string; value: number | string }
  | { id: string; kind: "time-point"; mediaIdentityDigest: string; atUs: number }
  | { id: string; kind: "time-range"; mediaIdentityDigest: string; startUs: number; endUs: number }
  | { id: string; kind: "marker"; projectId: string; mediaIdentityDigest: string; markerId: string }
  | { id: string; kind: "audio-range"; projectId: string; mediaIdentityDigest: string; assetId: string; sourceStartUs: number; sourceEndUs: number; projectStartUs: number; projectEndUs: number }

export interface ResearchContext {
  id: string
  projectId: string
  target: ResearchTarget
  question: string
  status: ResearchStatus
  needsReview: boolean
  needsReviewReasons: string[]
  structureRevision: number
  evidence: EvidenceRef[]
  createdAt: string
  updatedAt: string
  revision: number
}

export function researchTargetKey(projectId: string, target: ResearchTarget): string {
  return `${projectId}:${target.kind}:${target.id}`
}

export function isValidResearchRange(range: Pick<ResearchRange, "startUs" | "endUs">): boolean {
  return Number.isSafeInteger(range.startUs) && Number.isSafeInteger(range.endUs)
    && range.startUs >= 0 && range.endUs > range.startUs
}

export type AnalysisSubjectKind = "shot" | "scene" | "sequence" | "section" | "film"

export interface AnalysisSubjectRef {
  kind: AnalysisSubjectKind
  id: string
}

export type AnalysisProvenanceKind =
  | "user"
  | "algorithm"
  | "derived"
  | "imported"
  | "ai-confirmed"
  | "migrated"
  | "remapped"

export interface AnalysisProvenance {
  kind: AnalysisProvenanceKind
  definitionVersion?: number
  profileVersion?: number
  provider?: string
  model?: string
  promptVersion?: string
  contextDefinitionVersion?: string
  migratedFrom?: string
  confirmedAt?: string
}

export interface AnalysisRecord {
  id: string
  projectId: string
  subject: AnalysisSubjectRef
  fieldId: string
  entry: AnalysisFieldEntry
  status: "confirmed" | "stale"
  staleReason: string | null
  provenance: AnalysisProvenance
  evidenceRefs: string[]
  structureRevision: number
  createdAt: string
  updatedAt: string
  revision: number
}

export interface AnalysisDependencyRevision {
  structureRevision: number
  analysisRevision: number
}

export interface AnalysisCandidate {
  id: string
  projectId: string
  subject: AnalysisSubjectRef
  fieldId: string
  proposedEntry: AnalysisFieldEntry
  status: "pending" | "accepted" | "rejected" | "stale" | "superseded" | "expired"
  observation?: string
  interpretation?: string
  evidenceRefs: string[]
  contextManifestId: string | null
  source: {
    runId?: string
    provider?: string
    model?: string
    promptVersion?: string
    contextDefinitionVersion?: string
  }
  dependencyRevision: AnalysisDependencyRevision
  acceptedRecordId: string | null
  createdAt: string
  updatedAt: string
  revision: number
}
export interface AnalysisContextManifest {
  id: string
  projectId: string
  taskKind: string
  subject: AnalysisSubjectRef
  dependencyRevision: AnalysisDependencyRevision
  promptDefinitionId: string | null
  promptDefinitionVersion: number | null
  contextDefinitionId: string
  contextDefinitionVersion: number
  evidenceRefs: string[]
  includedFieldIds: string[]
  mediaRanges: Array<{ startFrame: number; endFrame: number }>
  createdAt: string
}
export interface AnalysisEvidenceRecord {
  id: string
  projectId: string
  ref: EvidenceRef
  status: "valid" | "stale"
  staleReason: string | null
  recordId: string | null
  candidateId: string | null
  boundRevision: number | null
  createdAt: string
  updatedAt: string
  revision: number
}

export interface AnalysisFieldDefinition {
  fieldId: string
  semanticKey: string
  scope: AnalysisSubjectKind
  label: string
  kind: FieldDefinitionSnapshot["kind"]
  options: FieldDefinitionSnapshot["options"]
  unit?: string
  evidencePolicy: "none" | "optional" | "recommended" | "required"
  capabilities: {
    aiSuggestable: boolean
    timelineVisualizable: boolean
    exportable: boolean
  }
  definitionVersion: number
}

export interface AnalysisEligibility {
  eligible: boolean
  reasons: string[]
}

export interface AnalysisDataSnapshot {
  records: AnalysisRecord[]
  candidates: AnalysisCandidate[]
  evidence: AnalysisEvidenceRecord[]
  contextManifests: AnalysisContextManifest[]
}

export interface AnalysisRepositoryPort {
  listRecords(projectId: string): Promise<AnalysisRecord[]>
  listCandidates(projectId: string): Promise<AnalysisCandidate[]>
  listEvidence(projectId: string): Promise<AnalysisEvidenceRecord[]>
  listContextManifests(projectId: string): Promise<AnalysisContextManifest[]>
  saveContextManifest(manifest: AnalysisContextManifest): Promise<void>
  saveRecord(record: AnalysisRecord, expectedRevision: number | undefined, expectedProjectRevision: string): Promise<AnalysisRecord>
  saveCandidate(candidate: AnalysisCandidate, expectedRevision?: number): Promise<void>
  saveEvidence(evidence: AnalysisEvidenceRecord, expectedRevision: number | undefined, expectedProjectRevision: string): Promise<AnalysisEvidenceRecord>
  acceptCandidate(candidateId: string, expectedCandidateRevision: number, expectedProjectRevision: string): Promise<AnalysisRecord>
}

export function analysisFieldDefinitionFromSnapshot(
  definition: FieldDefinitionSnapshot,
  usage?: AnalysisProfileFieldUsage,
): AnalysisFieldDefinition {
  return {
    fieldId: definition.fieldId,
    semanticKey: definition.semanticKey,
    scope: definition.scope,
    label: definition.label,
    kind: definition.kind,
    options: structuredClone(definition.options),
    evidencePolicy: usage?.interaction.evidencePolicy ?? "optional",
    capabilities: {
      aiSuggestable: Boolean(usage),
      timelineVisualizable: definition.kind !== "text",
      exportable: true,
    },
    definitionVersion: definition.definitionVersion,
  }
}
