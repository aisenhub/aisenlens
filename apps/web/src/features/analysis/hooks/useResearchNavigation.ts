import { useCallback } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useProjectSession } from "../../editor/session/ProjectSessionProvider"
import useWorkflowNavigation from "../../workflow/hooks/useWorkflowNavigation"
import { createWorkflowSearch } from "../../workflow/services/workflowLocation"
import type { ProjectEditorState } from "../../editor/stores/createProjectEditorStore"

type ResearchScope = ProjectEditorState["researchScope"]
type ResearchTarget = ProjectEditorState["researchTarget"]

export default function useResearchNavigation(projectId: string | null | undefined) {
  const location = useLocation()
  const navigate = useNavigate()
  const workflow = useWorkflowNavigation(projectId)
  const researchMode = useProjectSession((state) => state.researchMode)
  const researchScope = useProjectSession((state) => state.researchScope)
  const researchTarget = useProjectSession((state) => state.researchTarget)
  const researchQueue = useProjectSession((state) => state.researchQueue)
  const researchQueueIndex = useProjectSession((state) => state.researchQueueIndex)
  const setResearchMode = useProjectSession((state) => state.setResearchMode)
  const setResearchScope = useProjectSession((state) => state.setResearchScope)
  const setResearchTarget = useProjectSession((state) => state.setResearchTarget)
  const setResearchQueue = useProjectSession((state) => state.setResearchQueue)
  const setReturnContext = useProjectSession((state) => state.setReturnContext)
  const returnContext = useProjectSession((state) => state.returnContext)

  const navigateWithResearch = useCallback((stage: "overview" | "analyze", view: "film" | "structure" | "scenes" | "shots" | "sound", next: Partial<{ mode: ProjectEditorState["researchMode"]; scopeKind: ResearchScope["kind"]; scopeId: string; fromUs: number; toUs: number; targetKind: NonNullable<ResearchTarget>["kind"]; targetId: string }>) => {
    const params = createWorkflowSearch(location.search, {
      projectId: workflow.projectId,
      stage,
      view,
      mode: next.mode,
      scopeKind: next.scopeKind,
      scopeId: next.scopeId,
      fromUs: next.fromUs,
      toUs: next.toUs,
      targetKind: next.targetKind,
      targetId: next.targetId,
    })
    navigate({ pathname: "/app", search: `?${params.toString()}` })
  }, [location.search, navigate, workflow.projectId])

  const previewTarget = useCallback((target: NonNullable<ResearchTarget>) => {
    setResearchTarget(target)
  }, [setResearchTarget])

  const enterSequential = useCallback((queue: string[], targetId?: string) => {
    setResearchMode("sequential")
    setResearchScope({ kind: "full-film" })
    setResearchQueue(queue, Math.max(0, targetId ? queue.indexOf(targetId) : 0))
    setResearchTarget(targetId ? { kind: "shot", id: targetId } : queue[0] ? { kind: "shot", id: queue[0] } : null)
    navigateWithResearch("analyze", "shots", { mode: "sequential", scopeKind: "full-film", targetKind: targetId ? "shot" : undefined, targetId })
  }, [navigateWithResearch, setResearchMode, setResearchQueue, setResearchScope, setResearchTarget])

  const enterResearch = useCallback((scope: ResearchScope, target: NonNullable<ResearchTarget> | null, queue: string[]) => {
    setReturnContext({ mode: researchMode, scope: researchScope, target: researchTarget, queue: researchQueue, queueIndex: researchQueueIndex, scrollTop: 0 })
    setResearchMode("range")
    setResearchScope(scope)
    setResearchQueue(queue)
    setResearchTarget(target)
    navigateWithResearch("analyze", "shots", { mode: "range", scopeKind: scope.kind, scopeId: scope.id, fromUs: scope.fromUs, toUs: scope.toUs, targetKind: target?.kind, targetId: target?.id })
  }, [navigateWithResearch, researchMode, researchQueue, researchQueueIndex, researchScope, researchTarget, setResearchMode, setResearchQueue, setResearchScope, setResearchTarget, setReturnContext])

  const returnToSequential = useCallback(() => {
    if (returnContext) {
      setResearchMode(returnContext.mode)
      setResearchScope(returnContext.scope)
      setResearchQueue(returnContext.queue, returnContext.queueIndex)
      setResearchTarget(returnContext.target)
      setReturnContext(null)
      navigateWithResearch("analyze", "shots", { mode: returnContext.mode, scopeKind: returnContext.scope.kind, scopeId: returnContext.scope.id, fromUs: returnContext.scope.fromUs, toUs: returnContext.scope.toUs, targetKind: returnContext.target?.kind, targetId: returnContext.target?.id })
    }
  }, [navigateWithResearch, returnContext, setResearchMode, setResearchQueue, setResearchScope, setResearchTarget, setReturnContext])

  const returnToOverview = useCallback(() => {
    navigateWithResearch("overview", "film", {})
  }, [navigateWithResearch])

  return { previewTarget, enterSequential, enterResearch, returnToSequential, returnToOverview }
}

