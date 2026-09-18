import { useCallback, useSyncExternalStore } from "react"
import type { WorkflowView, WorkflowWorkspace } from "../types.ts"
import {
  createDefaultNativeStudioPreferences,
  createDefaultWorkspaceLayout,
  getNativeStudioPreferenceSnapshot,
  subscribeNativeStudioPreferences,
  updateNativeStudioPreferences,
  type WorkspaceLayoutPreference,
} from "../services/workspacePreferenceService.ts"

export default function useWorkspacePreferences() {
  const preferences = useSyncExternalStore(
    subscribeNativeStudioPreferences,
    getNativeStudioPreferenceSnapshot,
    createDefaultNativeStudioPreferences,
  )

  const setRailExpanded = useCallback((railExpanded: boolean) => {
    updateNativeStudioPreferences((current) => ({ ...current, railExpanded }))
  }, [])

  const updateWorkspace = useCallback((workspace: WorkflowWorkspace, patch: Partial<WorkspaceLayoutPreference>) => {
    updateNativeStudioPreferences((current) => ({
      ...current,
      workspaces: {
        ...current.workspaces,
        [workspace]: { ...current.workspaces[workspace], ...patch },
      },
    }))
  }, [])

  const resetWorkspace = useCallback((workspace: WorkflowWorkspace) => {
    updateNativeStudioPreferences((current) => ({
      ...current,
      workspaces: {
        ...current.workspaces,
        [workspace]: createDefaultWorkspaceLayout(workspace),
      },
    }))
  }, [])

  const rememberView = useCallback((workspace: WorkflowWorkspace, view: WorkflowView) => {
    updateWorkspace(workspace, { lastView: view })
  }, [updateWorkspace])

  return { preferences, setRailExpanded, updateWorkspace, resetWorkspace, rememberView }
}
