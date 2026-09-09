import { useEffect, useState } from "react"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import type { EvidenceRef, ResearchContext, ResearchTarget } from "../types.ts"
import EvidenceReferences from "./EvidenceReferences"

interface ResearchContextPanelProps {
  projectId: string
  target: ResearchTarget | null
  context: ResearchContext | null
  mediaIdentityDigest: string
  currentTime: number
  currentShotId?: string | null
  firstScreenshotId?: string | null
  lastScreenshotId?: string | null
  onUpdate: (patch: Partial<Pick<ResearchContext, "question" | "status" | "needsReview">>) => Promise<void>
  onAddEvidence: (evidence: EvidenceRef) => void
  onRemoveEvidence: (evidenceId: string) => void
}

export default function ResearchContextPanel({ projectId, target, context, mediaIdentityDigest, currentTime, currentShotId, firstScreenshotId, lastScreenshotId, onUpdate, onAddEvidence, onRemoveEvidence }: ResearchContextPanelProps) {
  const [question, setQuestion] = useState(context?.question ?? "")
  useEffect(() => { setQuestion(context?.question ?? "") }, [context?.id, context?.question])
  if (!target) return null
  return <section className="border-t border-border"><div className="space-y-3 p-4"><div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-text-base">Research context</p><span className={`rounded px-1.5 py-0.5 text-[10px] ${context?.status === "completed" ? "bg-emerald-400/10 text-emerald-300" : context?.status === "in-progress" ? "bg-accent/10 text-accent" : "bg-white/5 text-text-muted"}`}>{context?.status === "completed" ? "已完成" : context?.status === "in-progress" ? "进行中" : "未开始"}</span></div><label className="block text-xs text-text-muted">问题<Input value={question} onChange={(event) => setQuestion(event.target.value)} onBlur={() => { if (question !== (context?.question ?? "")) void onUpdate({ question, status: question.trim() ? "in-progress" : context?.status }) }} className="mt-1 h-8 text-xs" placeholder="这一镜 / 这一组想验证什么？" /></label><div className="flex gap-2"><select aria-label="研究状态" value={context?.status ?? "not-started"} onChange={(event) => void onUpdate({ status: event.target.value as ResearchContext["status"] })} className="h-8 min-w-0 flex-1 rounded-md border border-border bg-bg-input px-2 text-xs text-text-base"><option value="not-started">未开始</option><option value="in-progress">进行中</option><option value="completed">已完成</option></select><Button type="button" variant={context?.needsReview ? "destructive" : "outline"} size="sm" onClick={() => void onUpdate({ needsReview: !context?.needsReview })}>{context?.needsReview ? "待复核" : "标记复核"}</Button></div></div><EvidenceReferences target={target} projectId={projectId} evidence={context?.evidence ?? []} mediaIdentityDigest={mediaIdentityDigest} currentTime={currentTime} currentShotId={currentShotId} firstScreenshotId={firstScreenshotId} lastScreenshotId={lastScreenshotId} onAdd={onAddEvidence} onRemove={onRemoveEvidence} /></section>
}
