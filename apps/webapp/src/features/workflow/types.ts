export const WORKFLOW_WORKSPACES = ["preparation", "analysis", "results"] as const

export type WorkflowWorkspace = (typeof WORKFLOW_WORKSPACES)[number]

export type WorkflowView =
  | "media"
  | "boundary-review"
  | "timeline"
  | "structure"
  | "scenes"
  | "shots"
  | "sound"
  | "notes"
  | "data"
  | "export"
  | "creative"

export type ResearchMode = "sequential" | "range"
export type ResearchScopeKind = "full-film" | "group" | "saved-range" | "transient-range"
export type ResearchTargetKind = "shot" | "group" | "range" | "evidence"

export interface WorkflowLocation {
  projectId: string | null
  workspace: WorkflowWorkspace
  view: WorkflowView
  mode?: ResearchMode
  scopeKind?: ResearchScopeKind
  scopeId?: string
  fromUs?: number
  toUs?: number
  targetKind?: ResearchTargetKind
  targetId?: string
}

export interface WorkflowWorkspaceDefinition {
  id: WorkflowWorkspace
  label: string
  description: string
  defaultView: WorkflowView
  views: readonly WorkflowView[]
}

export type WorkflowReturnEntityKind = "shot" | "group" | "range" | "boundary"

export interface WorkflowReturnContext {
  version: 1
  projectId: string
  origin: {
    workspace: WorkflowWorkspace
    view: WorkflowView
  }
  selectedEntity?: {
    kind: WorkflowReturnEntityKind
    id: string
  }
  research?: Partial<Pick<WorkflowLocation, "mode" | "scopeKind" | "scopeId" | "fromUs" | "toUs" | "targetKind" | "targetId">>
  playbackTimeSeconds?: number
  viewportHint?: {
    surface: "viewer" | "timeline" | "list"
    anchorId?: string
  }
  correctionTarget?: {
    kind: "shot" | "boundary"
    id: string
  }
  createdAt: string
}
