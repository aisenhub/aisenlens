import { createContext, useContext, useRef, type PropsWithChildren } from "react"
import { useStore } from "zustand"
import { createProjectEditorStore, type ProjectEditorState, type ProjectEditorStore } from "../stores/createProjectEditorStore"

const ProjectSessionContext = createContext<ProjectEditorStore | null>(null)

interface ProjectSessionProviderProps extends PropsWithChildren {
  projectId: string
}

export default function ProjectSessionProvider({ projectId, children }: ProjectSessionProviderProps) {
  const storeRef = useRef<ProjectEditorStore | null>(null)
  if (!storeRef.current || storeRef.current.getState().projectId !== projectId) {
    storeRef.current = createProjectEditorStore(projectId)
  }
  return <ProjectSessionContext.Provider value={storeRef.current}>{children}</ProjectSessionContext.Provider>
}

export function useProjectSession<T>(selector: (state: ProjectEditorState) => T): T {
  const store = useContext(ProjectSessionContext)
  if (!store) throw new Error("useProjectSession must be used inside ProjectSessionProvider")
  return useStore(store, selector)
}

export function useProjectSessionStore() {
  const store = useContext(ProjectSessionContext)
  if (!store) throw new Error("useProjectSessionStore must be used inside ProjectSessionProvider")
  return store
}
