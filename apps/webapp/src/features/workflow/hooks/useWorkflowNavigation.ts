import { useCallback, useEffect, useMemo } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { getWorkspaceDefinition } from "../constants/workflowWorkspaces.ts"
import { createWorkflowSearch, parseWorkflowLocation } from "../services/workflowLocation.ts"
import { getNativeStudioPreferenceSnapshot, updateNativeStudioPreferences } from "../services/workspacePreferenceService.ts"
import type { WorkflowLocation, WorkflowView, WorkflowWorkspace } from "../types.ts"

export default function useWorkflowNavigation(projectId?: string | null) {
  const location = useLocation()
  const navigate = useNavigate()
  const [, setSearchParams] = useSearchParams()
  const parsed = useMemo(() => parseWorkflowLocation(location.search), [location.search])
  const effectiveProjectId = projectId ?? parsed.projectId

  const goTo = useCallback(
    (workspace: WorkflowWorkspace, view?: WorkflowView, research?: Partial<Pick<WorkflowLocation, "mode" | "scopeKind" | "scopeId" | "fromUs" | "toUs" | "targetKind" | "targetId">>) => {
      const definition = getWorkspaceDefinition(workspace)
      const rememberedView = getNativeStudioPreferenceSnapshot().workspaces[workspace].lastView
      const nextView = view && definition.views.includes(view)
        ? view
        : rememberedView && definition.views.includes(rememberedView)
          ? rememberedView
          : definition.defaultView
      updateNativeStudioPreferences((current) => ({
        ...current,
        workspaces: {
          ...current.workspaces,
          [workspace]: { ...current.workspaces[workspace], lastView: nextView },
        },
      }))
      const params = createWorkflowSearch(location.search, {
        projectId: effectiveProjectId,
        workspace,
        view: nextView,
        ...research,
      })
      setSearchParams(params)
    },
    [effectiveProjectId, location.search, setSearchParams],
  )

  useEffect(() => {
    updateNativeStudioPreferences((current) => ({
      ...current,
      workspaces: {
        ...current.workspaces,
        [parsed.workspace]: { ...current.workspaces[parsed.workspace], lastView: parsed.view },
      },
    }))
  }, [parsed.view, parsed.workspace])

  const ensureProjectInLocation = useCallback(() => {
    if (!effectiveProjectId) return
    const hasLegacyStage = new URLSearchParams(location.search).has("stage")
    if (parsed.projectId === effectiveProjectId && !hasLegacyStage) return
    const params = createWorkflowSearch(location.search, {
      projectId: effectiveProjectId,
      workspace: parsed.workspace,
      view: parsed.view,
    })
    navigate({ pathname: "/app", search: `?${params.toString()}` }, { replace: true })
  }, [effectiveProjectId, location.search, navigate, parsed.projectId, parsed.view, parsed.workspace])

  return {
    ...parsed,
    projectId: effectiveProjectId,
    goTo,
    ensureProjectInLocation,
  }
}
