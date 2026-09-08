import { Check, ChevronRight } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { WORKFLOW_STAGE_DEFINITIONS } from "../constants/workflowStages.ts"
import type { WorkflowStage } from "../types.ts"

interface WorkflowSidebarProps {
  activeStage: WorkflowStage
  onStageChange: (stage: WorkflowStage) => void
}

export default function WorkflowSidebar({ activeStage, onStageChange }: WorkflowSidebarProps) {
  return (
    <nav className="hidden w-40 shrink-0 border-r border-border bg-bg-nav lg:flex lg:flex-col" aria-label="工作流阶段">
      <div className="border-b border-border px-4 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">AisenLens</p>
        <p className="mt-1 text-xs text-text-dim">理解工作台</p>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {WORKFLOW_STAGE_DEFINITIONS.map((stage) => {
          const active = activeStage === stage.id
          return (
            <Button
              key={stage.id}
              type="button"
              variant="ghost"
              onClick={() => onStageChange(stage.id)}
              aria-current={active ? "step" : undefined}
              className={`h-auto min-h-11 justify-start gap-2 rounded-md px-2.5 py-2 text-left ${active ? "bg-accent/15 text-accent" : "text-text-dim hover:bg-bg-hover hover:text-text-base"}`}
            >
              <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${active ? "border-accent bg-accent/15" : "border-border-mid"}`}>
                {active ? <ChevronRight className="size-3" /> : <Check className="size-3 opacity-0" />}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium">{stage.label}</span>
                <span className="mt-0.5 block truncate text-[10px] text-text-muted">{stage.description}</span>
              </span>
            </Button>
          )
        })}
      </div>
    </nav>
  )
}
