import { useEffect, useState } from "react"
import { ArrowLeft, Code2, Keyboard } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { Checkbox } from "../../../components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog"
import type { EditorShortcutDefinition } from "../shortcuts/definitions"

interface WorkspaceSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  liteCache: number
  onClearCache: () => void
  calibrationModeEnabled: boolean
  onCalibrationModeChange: (enabled: boolean) => void
  shortcuts: readonly EditorShortcutDefinition[]
}

type SettingsSection = "overview" | "shortcuts" | "developer"

export default function WorkspaceSettingsDialog({ open, onOpenChange, liteCache, onClearCache, calibrationModeEnabled, onCalibrationModeChange, shortcuts }: WorkspaceSettingsDialogProps) {
  const [section, setSection] = useState<SettingsSection>("overview")

  useEffect(() => {
    if (open) setSection("overview")
  }, [open])

  const sectionTitle = section === "overview" ? "设置" : section === "shortcuts" ? "快捷键" : "开发者工具"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(80vh,42rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {section !== "overview" && <Button type="button" variant="ghost" size="icon-xs" onClick={() => setSection("overview")} aria-label="返回设置" className="text-text-muted hover:text-text"><ArrowLeft /></Button>}
            <DialogTitle>{sectionTitle}</DialogTitle>
          </div>
          <DialogDescription>{section === "overview" ? "工作区设置独立于当前工作流阶段。" : section === "shortcuts" ? "查看当前工作区支持的键盘操作。" : "标定模式等实验性工作流选项。"}</DialogDescription>
        </DialogHeader>

        {section === "overview" && (
          <div className="flex flex-col gap-4">
            <section className="space-y-2">
              <p className="editor-heading font-mono tracking-wider text-text-muted">缓存管理</p>
              <div className="rounded-xl border border-border bg-bg-deep p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium text-white">本地缓存</p>
                  <span className="editor-meta font-mono text-accent">{liteCache} MB</span>
                </div>
                <div className="mb-2 h-1 w-full rounded-full bg-border"><div className="h-full rounded-full bg-accent/60 transition-all" style={{ width: `${(liteCache / 500) * 100}%` }} /></div>
                <p className="editor-meta font-mono text-text-muted">{liteCache} / 500 MB</p>
              </div>
              <Button type="button" variant="destructive" size="sm" onClick={onClearCache} className="h-8 w-full text-red-400 hover:text-red-400">清除缓存</Button>
            </section>

            <section className="space-y-2 border-t border-border pt-4">
              <p className="editor-heading font-mono tracking-wider text-text-muted">辅助工具</p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSection("shortcuts")} className="h-9 justify-start gap-2 border-border text-text-muted hover:text-text"><Keyboard className="size-4" strokeWidth={1.7} />快捷键</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setSection("developer")} className="h-9 justify-start gap-2 border-border text-text-muted hover:text-text"><Code2 className="size-4" strokeWidth={1.7} />开发者工具</Button>
              </div>
            </section>
          </div>
        )}

        {section === "shortcuts" && (
          <div className="flex flex-col">
            {shortcuts.map((shortcut) => (
              <div key={shortcut.action} className="flex flex-col gap-0.5 border-b border-border/40 py-2 last:border-0">
                <kbd className="editor-meta font-mono text-accent">{shortcut.key}</kbd>
                <span className="editor-meta text-text-muted">{shortcut.description}</span>
              </div>
            ))}
          </div>
        )}

        {section === "developer" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-accent/25 bg-accent/5 p-3">
              <p className="editor-heading font-mono tracking-wider text-accent">开发者工具</p>
              <p className="mt-1 text-[10px] leading-4 text-text-dim">这些选项用于实验和调试，不会改变已有项目的正式分镜。</p>
            </div>
            <label className="flex items-start justify-between gap-3 rounded-lg border border-border bg-bg-input/20 px-2.5 py-2.5">
              <span className="min-w-0"><span className="block text-xs font-medium text-text">启用标定模式</span><span className="mt-0.5 block text-[10px] leading-4 text-text-dim">自动分镜完成后显示候选切点的标注工具。</span></span>
              <Checkbox checked={calibrationModeEnabled} onCheckedChange={(checked) => onCalibrationModeChange(checked === true)} aria-label="启用标定模式" className="mt-0.5" />
            </label>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
