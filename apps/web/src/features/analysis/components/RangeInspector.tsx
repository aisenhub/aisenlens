import { useEffect, useState, type ComponentProps } from "react"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Textarea } from "../../../components/ui/textarea"
import type { ResearchContext, ResearchRange } from "../types.ts"
import EvidenceReferences from "./EvidenceReferences"

interface RangeInspectorProps {
  range: ResearchRange | null
  context: ResearchContext | null
  mediaIdentityDigest: string
  currentTime: number
  onCreate: (startUs: number, endUs: number) => Promise<ResearchRange | null>
  onUpdateRange: (range: ResearchRange, patch: Partial<Pick<ResearchRange, "startUs" | "endUs" | "title" | "observation" | "interpretation" | "summary">>) => Promise<void>
  onUpdateContext: (patch: Partial<Pick<ResearchContext, "question" | "status" | "needsReview">>) => Promise<void>
  onAddEvidence: (evidence: ComponentProps<typeof EvidenceReferences>["onAdd"] extends (evidence: infer Evidence) => void ? Evidence : never) => void
  onRemoveEvidence: (evidenceId: string) => void
}

const toSeconds = (value: number) => (value / 1_000_000).toFixed(2)

export default function RangeInspector({ range, context, mediaIdentityDigest, currentTime, onCreate, onUpdateRange, onUpdateContext, onAddEvidence, onRemoveEvidence }: RangeInspectorProps) {
  const [start, setStart] = useState(range ? toSeconds(range.startUs) : Math.max(0, currentTime - 2).toFixed(2))
  const [end, setEnd] = useState(range ? toSeconds(range.endUs) : (currentTime + 2).toFixed(2))
  const [title, setTitle] = useState(range?.title ?? "")
  useEffect(() => { setStart(range ? toSeconds(range.startUs) : Math.max(0, currentTime - 2).toFixed(2)); setEnd(range ? toSeconds(range.endUs) : (currentTime + 2).toFixed(2)) }, [currentTime, range])
  useEffect(() => { setTitle(range?.title ?? "") }, [range?.id])
  if (!range) return <aside className="w-full shrink-0 overflow-y-auto border-l border-border bg-bg-panel p-4 lg:w-96"><p className="font-mono text-xs uppercase tracking-wider text-accent">Range inspector</p><p className="mt-2 text-xs leading-5 text-text-muted">为当前播放头创建一个可返回、可导出的研究范围。</p><div className="mt-4 grid grid-cols-2 gap-2"><label className="text-[11px] text-text-muted">开始（秒）<Input inputMode="decimal" value={start} onChange={(event) => setStart(event.target.value)} className="mt-1 h-8 text-xs" /></label><label className="text-[11px] text-text-muted">结束（秒）<Input inputMode="decimal" value={end} onChange={(event) => setEnd(event.target.value)} className="mt-1 h-8 text-xs" /></label></div><Button type="button" size="sm" className="mt-3" onClick={() => { const startUs = Math.round(Number(start) * 1_000_000); const endUs = Math.round(Number(end) * 1_000_000); if (Number.isFinite(startUs) && Number.isFinite(endUs) && endUs > startUs) void onCreate(startUs, endUs) }}>保存研究范围</Button></aside>
  const patchRange = (patch: Partial<Pick<ResearchRange, "title" | "observation" | "interpretation" | "summary">>) => { void onUpdateRange(range, patch) }
  return <aside className="w-full shrink-0 overflow-y-auto border-l border-border bg-bg-panel lg:w-96"><div className="border-b border-border px-4 py-3"><p className="font-mono text-xs text-accent">RANGE</p><p className="mt-1 font-mono text-[10px] text-text-muted">{toSeconds(range.startUs)}–{toSeconds(range.endUs)} s · rev {range.revision}</p></div><div className="space-y-4 p-4"><label className="block text-xs text-text-muted">标题<Input value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => { if (title !== range.title) patchRange({ title }) }} className="mt-1 h-8 text-xs" /></label><label className="block text-xs text-text-muted">研究问题<Input value={context?.question ?? ""} onChange={(event) => void onUpdateContext({ question: event.target.value, status: event.target.value.trim() ? "in-progress" : context?.status })} className="mt-1 h-8 text-xs" placeholder="这一段想验证什么？" /></label><label className="block text-xs text-text-muted">观察<Textarea defaultValue={range.observation} onBlur={(event) => patchRange({ observation: event.target.value })} rows={4} className="mt-1 resize-none text-xs" placeholder="先写可观察事实…" /></label><label className="block text-xs text-text-muted">解释<Textarea defaultValue={range.interpretation} onBlur={(event) => patchRange({ interpretation: event.target.value })} rows={4} className="mt-1 resize-none text-xs" placeholder="再写你的解释…" /></label><label className="block text-xs text-text-muted">摘要<Textarea defaultValue={range.summary} onBlur={(event) => patchRange({ summary: event.target.value })} rows={3} className="mt-1 resize-none text-xs" placeholder="给 Learn / 报告使用的短摘要…" /></label><div className="flex items-center gap-2"><select aria-label="研究状态" value={context?.status ?? "not-started"} onChange={(event) => void onUpdateContext({ status: event.target.value as ResearchContext["status"] })} className="h-8 flex-1 rounded-md border border-border bg-bg-input px-2 text-xs text-text-base"><option value="not-started">未开始</option><option value="in-progress">进行中</option><option value="completed">已完成</option></select><Button type="button" variant={context?.needsReview ? "destructive" : "outline"} size="sm" onClick={() => void onUpdateContext({ needsReview: !context?.needsReview })}>{context?.needsReview ? "待复核" : "标记复核"}</Button></div></div><EvidenceReferences target={{ kind: "range", id: range.id }} projectId={range.projectId} evidence={context?.evidence ?? []} mediaIdentityDigest={mediaIdentityDigest} currentTime={currentTime} onAdd={onAddEvidence} onRemove={onRemoveEvidence} /></aside>
}
