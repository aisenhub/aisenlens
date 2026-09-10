import { CheckSquare, X } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "../../../components/ui/button"
import type { AnalysisFieldCommand } from "../services/analysisFieldCommands"
import { previewAnalysisBatch } from "../services/analysisFieldCommands"
import type { AnalysisFieldEntry, ResolvedAnalysisProfile } from "../../template/types"
import type { ShotData } from "../../editor/constants/editorData"
import AnalysisFieldEntryInput from "./AnalysisFieldEntryInput"

interface BatchAnalysisPanelProps {
  profile: ResolvedAnalysisProfile | null
  shots: ShotData[]
  valuesByShotId: Record<string, Record<string, AnalysisFieldEntry>>
  selectedShotIds: string[]
  onSelectionChange: (shotId: string, selected: boolean) => void
  onApply: (command: AnalysisFieldCommand, shotIds: string[]) => void
  onClose: () => void
}

export default function BatchAnalysisPanel({ profile, shots, valuesByShotId, selectedShotIds, onSelectionChange, onApply, onClose }: BatchAnalysisPanelProps) {
  const fields = profile?.fields.filter((field) => field.definition.fieldId !== "shot_description" && field.surface.visible) ?? []
  const [fieldId, setFieldId] = useState(fields[0]?.definition.fieldId ?? "")
  const [pending, setPending] = useState<AnalysisFieldCommand | null>(null)
  const field = fields.find((candidate) => candidate.definition.fieldId === fieldId) ?? fields[0]
  const preview = useMemo(() => field ? previewAnalysisBatch(field.definition.fieldId, selectedShotIds, shots.map((shot) => shot.id), valuesByShotId) : { targetCount: 0, overwriteCount: 0, outsideScopeCount: selectedShotIds.length }, [field, selectedShotIds, shots, valuesByShotId])
  if (!field) return null
  return <section className="rounded-xl border border-accent/30 bg-accent/5 p-3"><div className="flex items-start justify-between gap-2"><div><p className="flex items-center gap-1.5 text-xs font-medium text-accent"><CheckSquare className="size-3.5" />批量记录</p><p className="mt-1 text-[11px] leading-4 text-text-muted">只作用于明确勾选的镜头；提交前会显示覆盖数量，失败时不会部分写入。</p></div><Button type="button" variant="ghost" size="icon-xs" onClick={onClose} aria-label="关闭批量记录"><X /></Button></div><div className="mt-3 flex flex-wrap gap-1.5"><Button type="button" variant="outline" size="xs" onClick={() => selectedShotIds.length === shots.length ? shots.forEach((shot) => onSelectionChange(shot.id, false)) : shots.forEach((shot) => onSelectionChange(shot.id, true))}>{selectedShotIds.length === shots.length ? "取消全选" : "全选镜头"}</Button><select value={field.definition.fieldId} onChange={(event) => { setFieldId(event.target.value); setPending(null) }} className="h-7 rounded-md border border-border bg-bg-input px-2 text-xs text-text-base">{fields.map((candidate) => <option key={candidate.definition.fieldId} value={candidate.definition.fieldId}>{candidate.definition.label}</option>)}</select></div><div className="mt-2 grid max-h-36 grid-cols-2 gap-1 overflow-y-auto rounded-md border border-border bg-bg-input/40 p-1 sm:grid-cols-3">{shots.map((shot, index) => <label key={shot.id} className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[11px] text-text-muted hover:bg-white/5"><input type="checkbox" checked={selectedShotIds.includes(shot.id)} onChange={(event) => onSelectionChange(shot.id, event.target.checked)} /><span>#{String(index + 1).padStart(2, "0")}</span></label>)}</div><div className="mt-3"><AnalysisFieldEntryInput definition={field.definition} surface={field.surface} entry={selectedShotIds[0] ? valuesByShotId[selectedShotIds[0]]?.[field.definition.fieldId] : undefined} onCommand={setPending} disabled={!selectedShotIds.length} issue={field.issues[0]} /></div>{pending && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-bg-input/50 px-2.5 py-2 text-[11px] text-text-muted"><span>将更新 {preview.targetCount} 镜 · 覆盖 {preview.overwriteCount} 个已有值{preview.outsideScopeCount ? ` · ${preview.outsideScopeCount} 个目标已不存在` : ""}</span><Button type="button" size="sm" disabled={!preview.targetCount || preview.outsideScopeCount > 0} onClick={() => { onApply(pending, selectedShotIds); setPending(null) }}>确认替换</Button></div>}</section>
}
