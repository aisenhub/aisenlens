import type { ReactNode } from "react"
import WorkflowSidebar from "./WorkflowSidebar"
import type { WorkflowStage } from "../types.ts"

interface ProjectWorkspaceShellProps {
  activeStage: WorkflowStage
  onStageChange: (stage: WorkflowStage) => void
  children: ReactNode
}

export default function ProjectWorkspaceShell({ activeStage, onStageChange, children }: ProjectWorkspaceShellProps) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-bg text-text-base">
      <div className="flex min-h-0 flex-1">
        <WorkflowSidebar activeStage={activeStage} onStageChange={onStageChange} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}
