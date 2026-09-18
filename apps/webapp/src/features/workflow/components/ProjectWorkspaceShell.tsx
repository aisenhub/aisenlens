import { useEffect, useRef, useState, type ReactNode } from "react"
import WorkflowSidebar from "./WorkflowSidebar"
import type { WorkflowWorkspace } from "../types.ts"
import useWorkspacePreferences from "../hooks/useWorkspacePreferences.ts"
import WorkspaceCommandPalette from "./WorkspaceCommandPalette.tsx"

interface ProjectWorkspaceShellProps {
  activeWorkspace: WorkflowWorkspace
  onWorkspaceChange: (workspace: WorkflowWorkspace) => void
  onOpenSettings: () => void
  children: ReactNode
}

export default function ProjectWorkspaceShell({ activeWorkspace, onWorkspaceChange, onOpenSettings, children }: ProjectWorkspaceShellProps) {
  const { preferences, setRailExpanded, updateWorkspace, resetWorkspace } = useWorkspacePreferences()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const commandPaletteTriggerRef = useRef<HTMLElement | null>(null)
  const activeLayout = preferences.workspaces[activeWorkspace]

  const openCommandPalette = () => {
    commandPaletteTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setCommandPaletteOpen(true)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault()
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false)
        } else {
          commandPaletteTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          setCommandPaletteOpen(true)
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [commandPaletteOpen])

  return (
    <div className="native-studio-window flex h-screen min-w-0 flex-col bg-bg text-text-base" data-workspace={activeWorkspace} data-density={activeLayout.density}>
      <div className="flex min-h-0 flex-1 flex-col">
        <WorkflowSidebar variant="mobile" activeWorkspace={activeWorkspace} onWorkspaceChange={onWorkspaceChange} onOpenSettings={onOpenSettings} density={activeLayout.density} onDensityChange={(density) => updateWorkspace(activeWorkspace, { density })} onResetWorkspaceLayout={resetWorkspace} onOpenCommandPalette={openCommandPalette} />
        <div className="flex min-h-0 flex-1">
          <WorkflowSidebar variant="desktop" activeWorkspace={activeWorkspace} onWorkspaceChange={onWorkspaceChange} onOpenSettings={onOpenSettings} expanded={preferences.railExpanded} onExpandedChange={setRailExpanded} density={activeLayout.density} onDensityChange={(density) => updateWorkspace(activeWorkspace, { density })} onResetWorkspaceLayout={resetWorkspace} onOpenCommandPalette={openCommandPalette} />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
      <WorkspaceCommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} activeWorkspace={activeWorkspace} onWorkspaceChange={onWorkspaceChange} onOpenSettings={onOpenSettings} finalFocusRef={commandPaletteTriggerRef} />
    </div>
  )
}
