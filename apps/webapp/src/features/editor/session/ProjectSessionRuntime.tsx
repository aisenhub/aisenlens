import { useEffect, type PropsWithChildren } from "react"
import { useLocation } from "react-router-dom"
import { useProjectSession } from "./ProjectSessionProvider"
import { parseWorkflowLocation } from "../../workflow/services/workflowLocation"

interface ProjectSessionRuntimeProps extends PropsWithChildren {
  isLoading: boolean
  hasError: boolean
}

export default function ProjectSessionRuntime({ isLoading, hasError, children }: ProjectSessionRuntimeProps) {
  const setHydrated = useProjectSession((state) => state.setHydrated)
  const setLifecycle = useProjectSession((state) => state.setLifecycle)
  const setResearchMode = useProjectSession((state) => state.setResearchMode)
  const setResearchScope = useProjectSession((state) => state.setResearchScope)
  const setResearchTarget = useProjectSession((state) => state.setResearchTarget)
  const location = useLocation()

  useEffect(() => {
    if (hasError) {
      setLifecycle("error")
      return
    }
    setHydrated(!isLoading)
  }, [hasError, isLoading, setHydrated, setLifecycle])

  useEffect(() => {
    const workflow = parseWorkflowLocation(location.search)
    if (workflow.mode) setResearchMode(workflow.mode)
    if (workflow.scopeKind) setResearchScope({ kind: workflow.scopeKind, ...(workflow.scopeId ? { id: workflow.scopeId } : {}), ...(workflow.fromUs !== undefined ? { fromUs: workflow.fromUs } : {}), ...(workflow.toUs !== undefined ? { toUs: workflow.toUs } : {}) })
    setResearchTarget(workflow.targetKind && workflow.targetId ? { kind: workflow.targetKind, id: workflow.targetId } : null)
  }, [location.search, setResearchMode, setResearchScope, setResearchTarget])

  return <>{children}</>
}
