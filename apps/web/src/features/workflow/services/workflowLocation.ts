import {
  getStageDefinition,
  WORKFLOW_STAGE_DEFINITIONS,
} from "../constants/workflowStages.ts"
import type { WorkflowLocation, WorkflowStage, WorkflowView } from "../types.ts"

const stageIds = new Set(WORKFLOW_STAGE_DEFINITIONS.map(({ id }) => id))

export function parseWorkflowLocation(search: string): WorkflowLocation {
  const params = new URLSearchParams(search)
  const requestedStage = params.get("stage")
  const stage: WorkflowStage = stageIds.has(requestedStage as WorkflowStage)
    ? (requestedStage as WorkflowStage)
    : "analyze"
  const definition = getStageDefinition(stage)
  const requestedView = params.get("view") as WorkflowView | null
  const view = definition.views.includes(requestedView as WorkflowView)
    ? (requestedView as WorkflowView)
    : definition.defaultView

  return {
    projectId: params.get("project") || null,
    stage,
    view,
  }
}

export function createWorkflowSearch(
  currentSearch: string,
  next: Partial<Pick<WorkflowLocation, "projectId" | "stage" | "view">>,
) {
  const params = new URLSearchParams(currentSearch)
  if (next.projectId !== undefined) {
    if (next.projectId) params.set("project", next.projectId)
    else params.delete("project")
  }
  if (next.stage !== undefined) params.set("stage", next.stage)
  if (next.view !== undefined) params.set("view", next.view)
  return params
}
