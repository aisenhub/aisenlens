import {
  BarChart3,
  Clapperboard,
  Command,
  LayoutPanelTop,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "../../../components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../../../components/ui/context-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover"
import { WORKFLOW_WORKSPACE_DEFINITIONS } from "../constants/workflowWorkspaces.ts"
import type { WorkspaceDensity } from "../services/workspacePreferenceService.ts"
import type { WorkflowWorkspace } from "../types.ts"

interface WorkflowSidebarProps {
  activeWorkspace: WorkflowWorkspace
  onWorkspaceChange: (workspace: WorkflowWorkspace) => void
  onOpenSettings: () => void
  variant?: "desktop" | "mobile"
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  density: WorkspaceDensity
  onDensityChange: (density: WorkspaceDensity) => void
  onResetWorkspaceLayout: (workspace: WorkflowWorkspace) => void
  onOpenCommandPalette: () => void
}

const workspaceIcons = {
  preparation: SlidersHorizontal,
  analysis: Clapperboard,
  results: BarChart3,
} satisfies Record<WorkflowWorkspace, typeof Clapperboard>

const densityOptions = [
  ["comfort", "舒适"],
  ["standard", "标准"],
  ["compact", "紧凑"],
] as const

export default function WorkflowSidebar({
  activeWorkspace,
  onWorkspaceChange,
  onOpenSettings,
  variant = "desktop",
  expanded = false,
  onExpandedChange,
  density,
  onDensityChange,
  onResetWorkspaceLayout,
  onOpenCommandPalette,
}: WorkflowSidebarProps) {
  const isMobile = variant === "mobile"
  const showLabels = isMobile || expanded
  const footerButtonClass = `${isMobile ? "h-10 shrink-0" : "mt-1 h-8 w-full"} gap-2 rounded-md text-text-muted hover:bg-bg-hover hover:text-text-base ${expanded || isMobile ? "justify-start px-2.5" : "justify-center px-0"}`

  return (
    <nav
      className={
        isMobile
          ? "native-workspace-nav-mobile min-w-0 shrink-0 border-b border-border bg-bg-nav"
          : `native-workspace-nav-desktop native-studio-rail shrink-0 border-r border-border bg-bg-nav flex-col ${expanded ? "w-44" : "w-14"}`
      }
      aria-label="工作区"
    >
      {!isMobile && (
        <div className={`flex h-11 shrink-0 items-center border-b border-border ${expanded ? "px-3" : "justify-center px-0"}`}>
          <span className="flex size-7 items-center justify-center rounded-md border border-border-mid bg-bg-card font-semibold text-accent">A</span>
          {expanded && <span className="ml-2 truncate text-xs font-semibold text-text-base">AisenLens</span>}
        </div>
      )}

      <div className={isMobile ? "flex min-w-0 flex-1 gap-1 overflow-x-auto p-2" : `flex flex-1 flex-col gap-1 ${expanded ? "p-2" : "px-2 py-3"}`}>
        {WORKFLOW_WORKSPACE_DEFINITIONS.map((workspace) => {
          const active = activeWorkspace === workspace.id
          const Icon = workspaceIcons[workspace.id]
          return (
            <ContextMenu key={workspace.id}>
              <ContextMenuTrigger className={isMobile ? "shrink-0" : "w-full"}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onWorkspaceChange(workspace.id)}
                  aria-current={active ? "page" : undefined}
                  title={workspace.description}
                  className={
                    isMobile
                      ? `h-10 shrink-0 justify-start gap-2 rounded-md px-3 text-left ${active ? "bg-accent/15 text-accent" : "text-text-dim hover:bg-bg-hover hover:text-text-base"}`
                      : `h-[var(--native-control-height)] w-full gap-2 rounded-md ${expanded ? "justify-start px-2.5 text-left" : "justify-center px-0"} ${active ? "bg-accent/15 text-accent" : "text-text-dim hover:bg-bg-hover hover:text-text-base"}`
                  }
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.7} />
                  <span className={showLabels ? "block min-w-0 truncate text-xs font-medium" : "sr-only"}>{workspace.label}</span>
                </Button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => onWorkspaceChange(workspace.id)}>
                  打开{workspace.label}工作区
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => onResetWorkspaceLayout(workspace.id)}>
                  <RotateCcw className="mr-2 size-3.5" />
                  恢复该工作区布局
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          )
        })}
      </div>

      <div className={isMobile ? "flex shrink-0 items-center gap-1 py-2 pr-2" : `shrink-0 border-t border-border ${expanded ? "p-2" : "px-2 py-2"}`}>
        <Button type="button" variant="ghost" size="sm" aria-label="打开工作区设置" title="工作区设置" onClick={onOpenSettings} className={footerButtonClass}>
          <Settings2 className="size-4 shrink-0" />
          <span className={showLabels ? "truncate text-xs font-medium" : "sr-only"}>设置</span>
        </Button>

        <Button type="button" variant="ghost" size="sm" aria-label="打开命令面板" title="命令面板（Ctrl/Cmd + K）" onClick={onOpenCommandPalette} className={footerButtonClass}>
          <Command className="size-4" />
          {showLabels && <span className="text-xs">命令</span>}
        </Button>

        <Popover>
          <PopoverTrigger
            aria-label="工作区布局"
            title="工作区布局"
            className={`${footerButtonClass} inline-flex items-center text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50`}
          >
            <LayoutPanelTop className="size-4" />
            {showLabels && <span>布局</span>}
          </PopoverTrigger>
          <PopoverContent side={isMobile ? "top" : "right"} align="end" className="w-64 p-3">
            <p className="text-xs font-medium text-text-base">界面密度</p>
            <p className="mt-1 text-[11px] leading-4 text-text-muted">只影响当前工作区的界面几何，不修改项目数据。</p>
            <div className="mt-3 grid grid-cols-3 gap-1">
              {densityOptions.map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-pressed={density === value}
                  onClick={() => onDensityChange(value)}
                  className={density === value ? "bg-accent/15 text-accent" : "text-text-dim"}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onResetWorkspaceLayout(activeWorkspace)}
              className="mt-3 w-full justify-start gap-2 border-t border-border pt-3 text-text-muted hover:text-text-base"
            >
              <RotateCcw className="size-3.5" />
              恢复当前工作区布局
            </Button>
          </PopoverContent>
        </Popover>

        {!isMobile && onExpandedChange && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={expanded ? "收起工作区导航" : "展开工作区导航"}
            title={expanded ? "收起导航" : "展开导航"}
            onClick={() => onExpandedChange(!expanded)}
            className={footerButtonClass}
          >
            {expanded ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            {expanded && <span className="text-xs">收起</span>}
          </Button>
        )}
      </div>
    </nav>
  )
}
