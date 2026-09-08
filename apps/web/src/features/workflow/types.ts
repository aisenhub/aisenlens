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

export interface WorkflowLocation {
  projectId: string | null
  stage: WorkflowStage
  view: WorkflowView
}

export interface WorkflowStageDefinition {
  id: WorkflowStage
  label: string
  description: string
  defaultView: WorkflowView
  views: readonly WorkflowView[]
}
