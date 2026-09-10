import { Check, CircleHelp, Eraser, MinusCircle } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Textarea } from "../../../components/ui/textarea"
import type { AnalysisFieldEntry, AnalysisFieldValue, FieldDefinitionSnapshot, FieldSurfaceSettings } from "../../template/types"
import type { AnalysisFieldCommand } from "../services/analysisFieldCommands"

interface AnalysisFieldEntryInputProps {
  definition: FieldDefinitionSnapshot
  surface: FieldSurfaceSettings
  entry: AnalysisFieldEntry | undefined
  onCommand: (command: AnalysisFieldCommand) => void
  disabled?: boolean
  issue?: string
  onEditingStart?: () => void
  onEditingEnd?: () => void
}

function setValue(entry: AnalysisFieldEntry | undefined): AnalysisFieldValue | undefined {
  return entry?.state === "set" ? entry.value : undefined
}

export default function AnalysisFieldEntryInput({ definition, surface, entry, onCommand, disabled = false, issue, onEditingStart, onEditingEnd }: AnalysisFieldEntryInputProps) {
  const value = setValue(entry)
  const selected = new Set(Array.isArray(value) ? value : typeof value === "string" ? [value] : [])
  const isRetired = definition.options.some((option) => option.retired && selected.has(option.id))
  const submitText = (next: string) => onCommand({ kind: next.trim() ? "set" : "clear", fieldId: definition.fieldId, value: next } as AnalysisFieldCommand)
  const renderValue = () => {
    if (definition.kind === "text") return <Textarea value={typeof value === "string" ? value : ""} onFocus={onEditingStart} onBlur={onEditingEnd} onChange={(event) => submitText(event.target.value)} rows={surface.density === "compact" ? 2 : 3} disabled={disabled} placeholder="记录观察到的事实…" className="mt-2 resize-none border-border bg-bg-input text-xs" />
    if (definition.kind === "number") return <Input type="number" value={typeof value === "number" ? value : ""} onChange={(event) => { const raw = event.target.value; if (!raw) onCommand({ kind: "clear", fieldId: definition.fieldId }); else onCommand({ kind: "set", fieldId: definition.fieldId, value: Number(raw) }) }} disabled={disabled} className="mt-2 h-8 border-border bg-bg-input text-xs" />
    if (definition.kind === "boolean") return <div className="mt-2 flex flex-wrap gap-1.5"><Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onCommand({ kind: "set", fieldId: definition.fieldId, value: true })} className={value === true ? "border-accent/50 bg-accent/15 text-accent" : "border-border text-text-dim"}>是</Button><Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onCommand({ kind: "set", fieldId: definition.fieldId, value: false })} className={value === false ? "border-accent/50 bg-accent/15 text-accent" : "border-border text-text-dim"}>否</Button></div>
    const multi = definition.kind === "multi-select"
    return <div className="mt-2 flex flex-wrap gap-1.5">{definition.options.map((option) => { const active = selected.has(option.id); return <Button key={option.id} type="button" variant="outline" size="sm" disabled={disabled || option.retired} onClick={() => { const next = multi ? (active ? [...selected].filter((id) => id !== option.id) : [...selected, option.id]) : option.id; if (Array.isArray(next) && next.length === 0) onCommand({ kind: "clear", fieldId: definition.fieldId }); else onCommand({ kind: "set", fieldId: definition.fieldId, value: next }) }} className={`${active ? "border-accent/50 bg-accent/15 text-accent" : "border-border text-text-dim"} ${option.retired ? "cursor-not-allowed opacity-60" : ""}`} title={option.retired ? "已停用：仅保留历史可读性" : undefined}>{active && <Check className="mr-1 size-3" />}{option.label}{option.retired ? "（停用）" : ""}</Button> })}</div>
  }
  return <section className="rounded-lg border border-border bg-bg-card/60 p-3" data-analysis-field={definition.fieldId}>
    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-sm font-medium text-text-base">{definition.label}</p>{surface.showDescription && <p className="mt-1 text-[11px] leading-4 text-text-muted">{definition.description}</p>}</div><span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${entry?.state === "unknown" ? "bg-amber-400/10 text-amber-200" : entry?.state === "not_applicable" ? "bg-slate-400/10 text-text-dim" : entry?.state === "set" ? "bg-emerald-400/10 text-emerald-200" : "bg-bg-input text-text-muted"}`}>{entry?.state === "unknown" ? "待判断" : entry?.state === "not_applicable" ? "不适用" : entry?.state === "set" ? (isRetired ? "历史停用值" : "已填写") : "未填写"}</span></div>
    {renderValue()}
    <div className="mt-2 flex flex-wrap items-center gap-1.5"><Button type="button" variant="ghost" size="xs" disabled={disabled} onClick={() => onCommand({ kind: "clear", fieldId: definition.fieldId })} className="gap-1 text-text-muted hover:text-text-base"><Eraser className="size-3" />清空</Button><Button type="button" variant="ghost" size="xs" disabled={disabled} onClick={() => onCommand({ kind: "unknown", fieldId: definition.fieldId })} className="gap-1 text-text-muted hover:text-amber-200"><CircleHelp className="size-3" />无法判断</Button>{definition.allowsNotApplicable && <Button type="button" variant="ghost" size="xs" disabled={disabled} onClick={() => onCommand({ kind: "not_applicable", fieldId: definition.fieldId })} className="gap-1 text-text-muted hover:text-text-base"><MinusCircle className="size-3" />不适用</Button>}</div>
    {surface.showReferenceTerms && definition.referenceTerms.length > 0 && <p className="mt-2 text-[10px] leading-4 text-text-muted">参考：{definition.referenceTerms.map((term) => `${term.label}（${term.hint}）`).join(" · ")}</p>}
    {issue && <p role="alert" className="mt-2 text-[11px] text-red-200">{issue}</p>}
  </section>
}
