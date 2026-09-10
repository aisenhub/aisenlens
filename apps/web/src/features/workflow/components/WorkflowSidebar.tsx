import { Check, ChevronRight, CircleUserRound, Settings2 } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../../../components/ui/dropdown-menu"
import { WORKFLOW_STAGE_DEFINITIONS } from "../constants/workflowStages.ts"
import type { WorkflowStage } from "../types.ts"

interface WorkflowSidebarProps {
  activeStage: WorkflowStage
  onStageChange: (stage: WorkflowStage) => void
  onOpenSettings: () => void
  variant?: "desktop" | "mobile"
}

const TEMPORARY_USER_NAME = "临时用户"

export default function WorkflowSidebar({ activeStage, onStageChange, onOpenSettings, variant = "desktop" }: WorkflowSidebarProps) {
  const isMobile = variant === "mobile"
  const accountMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="sm" aria-label="打开临时用户菜单" title="临时用户" className={isMobile ? "h-10 shrink-0 gap-2 rounded-md border-l border-border px-3 text-text-dim hover:bg-bg-hover hover:text-text-base" : "h-auto w-full justify-start gap-2 rounded-md px-2.5 py-2 text-left text-text-dim hover:bg-bg-hover hover:text-text-base"} />}>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/15 text-accent">
          <CircleUserRound className="size-4" />
        </span>
        <span className="truncate text-xs font-medium">{TEMPORARY_USER_NAME}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={isMobile ? "bottom" : "right"} align={isMobile ? "end" : "start"} className="w-44 border border-border bg-bg-panel text-text-dim">
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5 text-xs text-text-muted">{TEMPORARY_USER_NAME}</DropdownMenuLabel>
          <DropdownMenuItem onClick={onOpenSettings} className="h-8 gap-2 text-xs text-text-dim focus:bg-white/6 focus:text-white">
            <Settings2 className="size-3.5" />
            设置
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <nav
      className={isMobile
        ? "flex min-w-0 shrink-0 border-b border-border bg-bg-nav lg:hidden"
        : "hidden w-40 shrink-0 border-r border-border bg-bg-nav lg:flex lg:flex-col"}
      aria-label="工作流阶段"
    >
      {!isMobile && <div className="border-b border-border px-4 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">AisenLens</p>
        <p className="mt-1 text-xs text-text-dim">理解工作台</p>
      </div>}
      <div className={isMobile ? "flex min-w-0 flex-1 gap-1 overflow-x-auto p-2" : "flex flex-1 flex-col gap-1 p-3"}>
        {WORKFLOW_STAGE_DEFINITIONS.map((stage) => {
          const active = activeStage === stage.id
          return (
            <Button
              key={stage.id}
              type="button"
              variant="ghost"
              onClick={() => onStageChange(stage.id)}
              aria-current={active ? "step" : undefined}
              title={stage.description}
              className={isMobile
                ? `h-10 shrink-0 justify-start gap-2 rounded-md px-3 text-left ${active ? "bg-accent/15 text-accent" : "text-text-dim hover:bg-bg-hover hover:text-text-base"}`
                : `h-auto min-h-11 justify-start gap-2 rounded-md px-2.5 py-2 text-left ${active ? "bg-accent/15 text-accent" : "text-text-dim hover:bg-bg-hover hover:text-text-base"}`}
            >
              <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${active ? "border-accent bg-accent/15" : "border-border-mid"}`}>
                {active ? <ChevronRight className="size-3" /> : <Check className="size-3 opacity-0" />}
              </span>
              <span className="block min-w-0 truncate text-xs font-medium">{stage.label}</span>
            </Button>
          )
        })}
      </div>
      <div className={isMobile ? "shrink-0 py-2 pr-2" : "shrink-0 border-t border-border p-3"}>
        {accountMenu}
      </div>
    </nav>
  )
}
