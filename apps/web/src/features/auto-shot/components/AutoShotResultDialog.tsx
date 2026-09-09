import { ArrowRight, CheckCircle2, X } from "lucide-react"
import { Button } from "../../../components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog"
import type { ResolvedAutoShotConfiguration } from "../config/types"
import type { AutoShotTaskRecord } from "../types"
import RunStatus from "./RunStatus"

interface AutoShotResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: AutoShotTaskRecord | null
  frameRate: number
  isActive: boolean
  error: string | null
  resolved: ResolvedAutoShotConfiguration | null
  onStart: () => void
  onPause: () => void
  onRestart: () => void
  onApply: () => void
}

function formatFrameTime(frame: number, frameRate: number) {
  return `${(frame / Math.max(1, frameRate)).toFixed(2)}s`
}

function statusLabel(record: AutoShotTaskRecord | null, isActive: boolean) {
  if (isActive || record?.status === "running") return "扫描中"
  if (record?.status === "completed") return "扫描完成"
  if (record?.status === "paused") return "已暂停"
  if (record?.status === "failed") return "扫描失败"
  return "等待开始"
}

export default function AutoShotResultDialog({ open, onOpenChange, record, frameRate, isActive, error, resolved, onStart, onPause, onRestart, onApply }: AutoShotResultDialogProps) {
  const candidates = record?.candidates ?? []
  const boundaryCount = candidates.filter((candidate) => candidate.kind !== "tail").length
  const completed = record?.status === "completed"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-h-[min(760px,calc(100vh-2rem))] max-w-2xl overflow-hidden border-border bg-bg-panel p-0">
        <DialogHeader className="border-b border-border bg-bg-nav px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-base text-text-base">自动分镜</DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-5 text-text-muted">扫描只生成候选区间，应用前仍可在校准页面复核和调整。</DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded-full border px-2 py-1 font-mono text-[10px] ${completed ? "border-green-400/25 bg-green-400/10 text-green-300" : "border-accent/25 bg-accent/10 text-accent"}`}>
                {statusLabel(record, isActive)}
              </span>
              <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="关闭自动分镜弹窗" className="text-text-muted hover:bg-white/8 hover:text-white" />}>
                <X className="size-4" />
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-5 py-4">
          <RunStatus record={record} isActive={isActive} error={error} disabled={!resolved} onStart={onStart} onPause={onPause} onRestart={onRestart} />

          {completed && record && (
            <section className="mt-4 overflow-hidden rounded-lg border border-border bg-bg-deep" aria-labelledby="auto-shot-candidates-title">
              <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
                <div>
                  <h2 id="auto-shot-candidates-title" className="text-sm font-medium text-text-base">候选分镜</h2>
                  <p className="mt-0.5 text-[11px] text-text-muted">{boundaryCount} 个检测边界 · {candidates.length} 段连续区间</p>
                </div>
                <CheckCircle2 className="size-4 shrink-0 text-green-300" aria-hidden="true" />
              </div>
              <div className="max-h-64 divide-y divide-border overflow-y-auto">
                {candidates.map((candidate, index) => (
                  <div key={candidate.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs text-text-base">候选 {String(index + 1).padStart(2, "0")} · {candidate.kind === "hard-cut" ? "硬切" : candidate.kind === "fade" ? "淡入淡出" : "尾段"}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-text-muted">{formatFrameTime(candidate.startFrame, frameRate)} – {formatFrameTime(candidate.endFrame, frameRate)} · 帧 {candidate.startFrame}–{candidate.endFrame - 1}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-text-dim">score {candidate.score.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!record && !isActive && !error && <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-text-muted">准备开始扫描。完成后，候选分镜会显示在这里。</div>}
        </div>

        <DialogFooter className="border-t border-border bg-bg-nav/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-text-muted">关闭弹窗不会中断扫描，稍后可从准备页重新打开。</p>
          <div className="flex gap-2">
            <DialogClose render={<Button type="button" variant="outline" size="sm" className="border-border text-text-dim hover:text-white" />}>关闭</DialogClose>
            {completed && <Button type="button" size="sm" onClick={onApply} className="gap-2 bg-accent text-white hover:bg-accent/90">应用分镜<ArrowRight className="size-3.5" /></Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
