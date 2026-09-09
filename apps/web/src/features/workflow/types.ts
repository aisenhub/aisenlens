export const WORKFLOW_STAGES = [
  "prepare",
  "calibrate",
  "overview",
  "analyze",
  "learn",
  "create",
] as const

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number]

export type WorkflowView =
  | "media"
  | "candidates"
  | "film"
  | "structure"
  | "scenes"
  | "shots"
  | "sound"
  | "notes"
  | "coming-soon"

export type ResearchMode = "sequential" | "range"
export type ResearchScopeKind = "full-film" | "group" | "saved-range" | "transient-range"
export type ResearchTargetKind = "shot" | "group" | "range" | "evidence"

export interface WorkflowLocation {
  projectId: string | null
  stage: WorkflowStage
  view: WorkflowView
  mode?: ResearchMode
  scopeKind?: ResearchScopeKind
  scopeId?: string
  fromUs?: number
  toUs?: number
  targetKind?: ResearchTargetKind
  targetId?: string
}

export interface WorkflowStageDefinition {
  id: WorkflowStage
  label: string
  description: string
  defaultView: WorkflowView
  views: readonly WorkflowView[]
}
