import type { ReactNode } from "react"
import WorkflowSidebar from "./WorkflowSidebar"
import type { WorkflowStage } from "../types.ts"

interface ProjectWorkspaceShellProps {
  activeStage: WorkflowStage
  onStageChange: (stage: WorkflowStage) => void
  onOpenSettings: () => void
  children: ReactNode
}

export default function ProjectWorkspaceShell({ activeStage, onStageChange, onOpenSettings, children }: ProjectWorkspaceShellProps) {
  return (
    <div className="flex h-screen min-w-0 flex-col bg-bg text-text-base">
      <div className="flex min-h-0 flex-1 flex-col">
        <WorkflowSidebar variant="mobile" activeStage={activeStage} onStageChange={onStageChange} onOpenSettings={onOpenSettings} />
        <div className="flex min-h-0 flex-1">
          <WorkflowSidebar variant="desktop" activeStage={activeStage} onStageChange={onStageChange} onOpenSettings={onOpenSettings} />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </div>
  )
}
