import { ArrowLeft, ArrowRight, Copy, SkipForward } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "../../../components/ui/button"
import type { AnalysisFieldEntry, ResolvedAnalysisProfile } from "../../template/types"
import AnalysisFieldEntryInput from "./AnalysisFieldEntryInput"
import type { AnalysisFieldCommand } from "../services/analysisFieldCommands"

interface FocusAnalysisModeProps {
  profile: ResolvedAnalysisProfile | null
  entries: Record<string, Record<string, AnalysisFieldEntry>>
  shots: Array<{ id: string }>
  activeShotId: string | null
  queue: string[]
  onLocateShot: (index: number) => void
  onCommand: (command: AnalysisFieldCommand) => void
  onCopyPrevious: (fieldId: string, previousShotId: string) => void
  onExit: () => void
  onEditingStart?: () => void
  onEditingEnd?: () => void
}

export default function FocusAnalysisMode({ profile, entries, shots, activeShotId, queue, onLocateShot, onCommand, onCopyPrevious, onExit, onEditingStart, onEditingEnd }: FocusAnalysisModeProps) {
  const fields = useMemo(() => profile?.fields.filter((field) => field.definition.fieldId !== "shot_description" && field.surface.visible) ?? [], [profile])
  const [fieldId, setFieldId] = useState(fields[0]?.definition.fieldId ?? "")
  const queueIndex = Math.max(0, queue.indexOf(activeShotId ?? ""))
  const activeEntries = activeShotId ? entries[activeShotId] ?? {} : {}
  const previousShotId = queueIndex > 0 ? queue[queueIndex - 1] : null
  const field = fields.find((candidate) => candidate.definition.fieldId === fieldId) ?? fields[0]
  const goToQueueIndex = (index: number) => {
    const shotId = queue[index]
    const shotIndex = shots.findIndex((shot) => shot.id === shotId)
    if (shotIndex >= 0) onLocateShot(shotIndex)
  }

  useEffect(() => {
    if (!field) return
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.isComposing || event.repeat || target?.matches("input, textarea, select, button, [contenteditable='true']")) return
      if (/^[1-9]$/.test(event.key)) {
        const next = fields[Number(event.key) - 1]
        if (next) { event.preventDefault(); setFieldId(next.definition.fieldId) }
      }
      if (event.key === "ArrowRight" && queueIndex < queue.length - 1) { event.preventDefault(); goToQueueIndex(queueIndex + 1) }
      if (event.key === "ArrowLeft" && queueIndex > 0) { event.preventDefault(); goToQueueIndex(queueIndex - 1) }
      if (event.key === "Escape") { event.preventDefault(); onExit() }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [fields, onExit, queue, queueIndex, shots])

  if (!field || !activeShotId) return <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-sm text-text-muted"><p>当前任务没有可聚焦的分析字段。</p><Button type="button" variant="outline" size="sm" onClick={onExit}>返回详情</Button></section>
  const canCopy = Boolean(previousShotId && entries[previousShotId]?.[field.definition.fieldId]?.state === "set")
  const isLast = queueIndex >= queue.length - 1
  return <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3"><div><p className="font-mono text-[10px] uppercase tracking-wider text-accent">Focus analysis</p><h2 className="mt-1 text-sm font-medium text-text-base">镜头 #{String(shots.findIndex((shot) => shot.id === activeShotId) + 1).padStart(2, "0")} · {field.definition.label}</h2><p className="mt-1 text-xs text-text-muted">本轮队列 {Math.min(queueIndex + 1, queue.length)}/{queue.length} · 数字 1–9 切换字段，方向键切镜</p></div><Button type="button" variant="ghost" size="sm" onClick={onExit}>返回详情</Button></div><div className="mx-auto w-full max-w-2xl space-y-3 p-4"><div className="flex flex-wrap gap-1.5">{fields.slice(0, 9).map((candidate, index) => <Button key={candidate.definition.fieldId} type="button" variant="outline" size="sm" aria-pressed={candidate.definition.fieldId === field.definition.fieldId} onClick={() => setFieldId(candidate.definition.fieldId)} className={candidate.definition.fieldId === field.definition.fieldId ? "border-accent/50 bg-accent/15 text-accent" : "border-border text-text-muted"}>{index + 1} · {candidate.definition.label}</Button>)}</div><AnalysisFieldEntryInput definition={field.definition} surface={field.surface} entry={activeEntries[field.definition.fieldId]} onCommand={onCommand} onEditingStart={onEditingStart} onEditingEnd={onEditingEnd} issue={field.issues[0]} /><div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-bg-card/50 p-3"><Button type="button" variant="ghost" size="sm" disabled={!canCopy} onClick={() => previousShotId && onCopyPrevious(field.definition.fieldId, previousShotId)} className="gap-1.5 text-text-muted"><Copy className="size-3.5" />复制上一镜</Button><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={queueIndex === 0} onClick={() => goToQueueIndex(queueIndex - 1)}><ArrowLeft className="mr-1 size-3.5" />上一镜</Button><Button type="button" variant="outline" size="sm" disabled={isLast} onClick={() => goToQueueIndex(queueIndex + 1)}>{isLast ? "本轮结束" : "下一镜"}<ArrowRight className="ml-1 size-3.5" /></Button><Button type="button" size="sm" disabled={isLast} onClick={() => goToQueueIndex(queueIndex + 1)}><SkipForward className="mr-1 size-3.5" />跳过</Button></div></div></div></section>
}
