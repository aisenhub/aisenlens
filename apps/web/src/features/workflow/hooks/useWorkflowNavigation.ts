import { useCallback, useMemo } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { getStageDefinition } from "../constants/workflowStages.ts"
import { createWorkflowSearch, parseWorkflowLocation } from "../services/workflowLocation.ts"
import type { WorkflowStage, WorkflowView } from "../types.ts"

export default function useWorkflowNavigation(projectId?: string | null) {
  const location = useLocation()
  const navigate = useNavigate()
  const [, setSearchParams] = useSearchParams()
  const parsed = useMemo(() => parseWorkflowLocation(location.search), [location.search])
  const effectiveProjectId = projectId ?? parsed.projectId

  const goTo = useCallback(
    (stage: WorkflowStage, view?: WorkflowView) => {
      const definition = getStageDefinition(stage)
      const nextView = view && definition.views.includes(view) ? view : definition.defaultView
      const params = createWorkflowSearch(location.search, {
        projectId: effectiveProjectId,
        stage,
        view: nextView,
      })
      setSearchParams(params)
    },
    [effectiveProjectId, location.search, setSearchParams],
  )

  const ensureProjectInLocation = useCallback(() => {
    if (!effectiveProjectId || parsed.projectId === effectiveProjectId) return
    const params = createWorkflowSearch(location.search, { projectId: effectiveProjectId })
    navigate({ pathname: "/app", search: `?${params.toString()}` }, { replace: true })
  }, [effectiveProjectId, location.search, navigate, parsed.projectId])

  return {
    ...parsed,
    projectId: effectiveProjectId,
    goTo,
    ensureProjectInLocation,
  }
}
