import { getWorkspaceDefinition } from "../constants/workflowWorkspaces.ts"
import type { WorkflowLocation, WorkflowReturnContext } from "../types.ts"

const RETURN_CONTEXT_PREFIX = "aisenlens.workflow.return-context.v1:"

interface SessionStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const storageKey = (projectId: string) => `${RETURN_CONTEXT_PREFIX}${projectId}`
const nonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0
const finiteNonNegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0

export const createWorkflowReturnContext = (
  location: WorkflowLocation,
  detail: Omit<Partial<WorkflowReturnContext>, "version" | "projectId" | "origin" | "createdAt"> = {},
): WorkflowReturnContext | null => {
  if (!location.projectId) return null
  return {
    version: 1,
    projectId: location.projectId,
    origin: { workspace: location.workspace, view: location.view },
    ...detail,
    createdAt: new Date().toISOString(),
  }
}

export const normalizeWorkflowReturnContext = (value: unknown, expectedProjectId?: string): WorkflowReturnContext | null => {
  if (!value || typeof value !== "object") return null
  const candidate = value as Partial<WorkflowReturnContext>
  if (candidate.version !== 1 || !nonEmptyString(candidate.projectId) || !candidate.origin) return null
  if (expectedProjectId && candidate.projectId !== expectedProjectId) return null
  const definition = getWorkspaceDefinition(candidate.origin.workspace)
  if (definition.id !== candidate.origin.workspace || !definition.views.includes(candidate.origin.view)) return null
  if (!nonEmptyString(candidate.createdAt)) return null

  const selectedEntity = candidate.selectedEntity && nonEmptyString(candidate.selectedEntity.id)
    && ["shot", "group", "range", "boundary"].includes(candidate.selectedEntity.kind)
    ? candidate.selectedEntity
    : undefined
  const correctionTarget = candidate.correctionTarget && nonEmptyString(candidate.correctionTarget.id)
    && (candidate.correctionTarget.kind === "shot" || candidate.correctionTarget.kind === "boundary")
    ? candidate.correctionTarget
    : undefined
  const viewportHint = candidate.viewportHint
    && (candidate.viewportHint.surface === "viewer" || candidate.viewportHint.surface === "timeline" || candidate.viewportHint.surface === "list")
    ? { surface: candidate.viewportHint.surface, ...(nonEmptyString(candidate.viewportHint.anchorId) ? { anchorId: candidate.viewportHint.anchorId } : {}) }
    : undefined

  return {
    version: 1,
    projectId: candidate.projectId,
    origin: candidate.origin,
    ...(selectedEntity ? { selectedEntity } : {}),
    ...(candidate.research ? { research: candidate.research } : {}),
    ...(finiteNonNegative(candidate.playbackTimeSeconds) ? { playbackTimeSeconds: candidate.playbackTimeSeconds } : {}),
    ...(viewportHint ? { viewportHint } : {}),
    ...(correctionTarget ? { correctionTarget } : {}),
    createdAt: candidate.createdAt,
  }
}

export const writeWorkflowReturnContext = (context: WorkflowReturnContext, storage?: SessionStorageLike | null) => {
  if (!storage) return
  try { storage.setItem(storageKey(context.projectId), JSON.stringify(context)) } catch { /* navigation context is best-effort */ }
}

export const readWorkflowReturnContext = (projectId: string, storage?: SessionStorageLike | null) => {
  if (!storage) return null
  try {
    const raw = storage.getItem(storageKey(projectId))
    return raw ? normalizeWorkflowReturnContext(JSON.parse(raw), projectId) : null
  } catch {
    return null
  }
}

export const clearWorkflowReturnContext = (projectId: string, storage?: SessionStorageLike | null) => {
  if (!storage) return
  try { storage.removeItem(storageKey(projectId)) } catch { /* best-effort */ }
}
