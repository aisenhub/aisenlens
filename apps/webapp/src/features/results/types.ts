import type { AnalysisFieldEntry, ProjectAnalysisProfileSnapshot } from "../template/types.ts"
import type { AnalysisProvenance } from "../analysis/types.ts"

export interface ResultCell {
  fieldId: string
  entry: AnalysisFieldEntry | null
  status: "confirmed" | "stale" | "missing"
  provenance: AnalysisProvenance | null
  evidenceRefs: string[]
}

export interface ResultRow {
  subjectId: string
  subjectKind: "shot" | "scene" | "sequence" | "section" | "film"
  startFrame: number | null
  endFrame: number | null
  cells: ResultCell[]
}

export interface ResultsDataset {
  projectId: string
  structureRevision: number
  analysisRevision: string | number | null
  profileId: string | null
  profileVersion: number | null
  rows: ResultRow[]
}

export interface ExportMapping {
  id: string
  version: number
  fieldIds: string[]
  includeStale: boolean
  profileRef: Pick<ProjectAnalysisProfileSnapshot, "id" | "version"> | null
}

export interface ExportPreset {
  id: string
  projectId: string
  name: string
  mapping: ExportMapping
  createdAt: string
  updatedAt: string
  revision: number
}

export interface DerivedArtifactRef {
  id: string
  projectId: string
  kind: "report" | "table" | "video" | "creative";
  sourceStructureRevision: number
  sourceAnalysisRevision: number
  createdAt: string
}