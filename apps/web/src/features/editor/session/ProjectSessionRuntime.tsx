import { useEffect, type PropsWithChildren } from "react"
import { useProjectSession } from "./ProjectSessionProvider"

interface ProjectSessionRuntimeProps extends PropsWithChildren {
  isLoading: boolean
  hasError: boolean
}

export default function ProjectSessionRuntime({ isLoading, hasError, children }: ProjectSessionRuntimeProps) {
  const setHydrated = useProjectSession((state) => state.setHydrated)
  const setLifecycle = useProjectSession((state) => state.setLifecycle)

  useEffect(() => {
    if (hasError) {
      setLifecycle("error")
      return
    }
    setHydrated(!isLoading)
  }, [hasError, isLoading, setHydrated, setLifecycle])

  return <>{children}</>
}
