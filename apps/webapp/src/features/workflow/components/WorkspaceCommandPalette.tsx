import { useEffect, useMemo, useState, type RefObject } from "react"
import { Command, Search, Settings2 } from "lucide-react"
import { Button } from "../../../components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog"
import { Input } from "../../../components/ui/input"
import { WORKFLOW_WORKSPACE_DEFINITIONS } from "../constants/workflowWorkspaces.ts"
import type { WorkflowWorkspace } from "../types.ts"

interface WorkspaceCommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeWorkspace: WorkflowWorkspace
  onWorkspaceChange: (workspace: WorkflowWorkspace) => void
  onOpenSettings: () => void
  finalFocusRef?: RefObject<HTMLElement | null>
}

export default function WorkspaceCommandPalette({
  open,
  onOpenChange,
  activeWorkspace,
  onWorkspaceChange,
  onOpenSettings,
  finalFocusRef,
}: WorkspaceCommandPaletteProps) {
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  const commands = useMemo(() => [
    ...WORKFLOW_WORKSPACE_DEFINITIONS.map((workspace) => ({
      id: "workspace:" + workspace.id,
      label: "打开" + workspace.label + "工作区",
      description: workspace.description,
      keywords: workspace.id + " " + workspace.label + " workspace",
      active: workspace.id === activeWorkspace,
      run: () => onWorkspaceChange(workspace.id),
    })),
    {
      id: "settings",
      label: "打开工作区设置",
      description: "项目模板、偏好与工作区设置",
      keywords: "settings 设置 preference",
      active: false,
      run: onOpenSettings,
    },
  ], [activeWorkspace, onOpenSettings, onWorkspaceChange])

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filtered = normalizedQuery
    ? commands.filter((command) =>
      (command.label + " " + command.description + " " + command.keywords).toLocaleLowerCase().includes(normalizedQuery))
    : commands

  const runCommand = (run: () => void) => {
    onOpenChange(false)
    run()
    window.setTimeout(() => {
      const target = finalFocusRef?.current
      if (target?.isConnected) {
        target.focus()
        return
      }
      const visibleTrigger = [...document.querySelectorAll<HTMLElement>('[aria-label="打开命令面板"]')]
        .find((element) => element.getClientRects().length > 0)
      visibleTrigger?.focus()
    }, 180)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        finalFocus={finalFocusRef ?? true}
        className="top-[18%] -translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
        aria-label="命令面板"
      >
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Command className="size-4 text-accent" />
            命令面板
          </DialogTitle>
          <DialogDescription className="sr-only">
            搜索并执行当前 AisenLens 工作区可用的真实命令。
          </DialogDescription>
        </DialogHeader>
        <label className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-text-muted" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索工作区或设置…"
            className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="rounded border border-border-mid bg-bg-input px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
            Esc
          </kbd>
        </label>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length ? filtered.map((command) => (
            <Button
              key={command.id}
              type="button"
              variant="ghost"
              onClick={() => runCommand(command.run)}
              className="h-auto w-full justify-start gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-left"
            >
              {command.id === "settings"
                ? <Settings2 className="size-4 text-text-muted" />
                : <span className={"size-2 rounded-full " + (command.active ? "bg-accent" : "bg-text-faint")} />}
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-text-base">{command.label}</span>
                <span className="mt-0.5 block truncate text-xs font-normal text-text-muted">{command.description}</span>
              </span>
              {command.active && <span className="text-[10px] font-medium text-accent">当前</span>}
            </Button>
          )) : (
            <div className="px-3 py-8 text-center text-sm text-text-muted">没有匹配命令</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
