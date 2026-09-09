import {
  getStageDefinition,
  WORKFLOW_STAGE_DEFINITIONS,
} from "../constants/workflowStages.ts"
import type { ResearchMode, ResearchScopeKind, ResearchTargetKind, WorkflowLocation, WorkflowStage, WorkflowView } from "../types.ts"

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

  const location: WorkflowLocation = {
    projectId: params.get("project") || null,
    stage,
    view,
  }
  const mode = params.get("mode")
  if (mode === "sequential" || mode === "range") location.mode = mode
  const scopeKind = params.get("scopeKind")
  if (scopeKind === "full-film" || scopeKind === "group" || scopeKind === "saved-range" || scopeKind === "transient-range") location.scopeKind = scopeKind
  const scopeId = params.get("scopeId")
  if (scopeId) location.scopeId = scopeId
  const fromRaw = params.get("fromUs")
  const toRaw = params.get("toUs")
  const fromUs = fromRaw === null ? Number.NaN : Number(fromRaw)
  const toUs = toRaw === null ? Number.NaN : Number(toRaw)
  if (Number.isSafeInteger(fromUs) && fromUs >= 0) location.fromUs = fromUs
  if (Number.isSafeInteger(toUs) && toUs > 0) location.toUs = toUs
  const targetKind = params.get("targetKind")
  if (targetKind === "shot" || targetKind === "group" || targetKind === "range" || targetKind === "evidence") location.targetKind = targetKind
  const targetId = params.get("targetId")
  if (targetId) location.targetId = targetId
  return location
}

export function createWorkflowSearch(
  currentSearch: string,
  next: Partial<Pick<WorkflowLocation, "projectId" | "stage" | "view" | "mode" | "scopeKind" | "scopeId" | "fromUs" | "toUs" | "targetKind" | "targetId">>,
) {
  const params = new URLSearchParams(currentSearch)
  if (next.projectId !== undefined) {
    if (next.projectId) params.set("project", next.projectId)
    else params.delete("project")
  }
  if (next.stage !== undefined) params.set("stage", next.stage)
  if (next.view !== undefined) params.set("view", next.view)
  for (const [key, value] of [["mode", next.mode], ["scopeKind", next.scopeKind], ["scopeId", next.scopeId], ["fromUs", next.fromUs], ["toUs", next.toUs], ["targetKind", next.targetKind], ["targetId", next.targetId]] as const) {
    if (value === undefined) continue
    if (value === null || value === "") params.delete(key)
    else params.set(key, String(value))
  }
  return params
}
