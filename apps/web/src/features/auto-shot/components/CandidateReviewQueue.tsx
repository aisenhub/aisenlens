import { Check, Eye, X } from "lucide-react"
import { Button } from "../../../components/ui/button"
import type { AutoShotCandidate } from "../types"

interface CandidateReviewQueueProps {
  candidates: AutoShotCandidate[]
  excludedCandidateIds: string[]
  selectedCandidateId: string | null
  onSelect: (candidate: AutoShotCandidate) => void
  onToggle: (candidateId: string, included: boolean) => void
}

export default function CandidateReviewQueue({ candidates, excludedCandidateIds, selectedCandidateId, onSelect, onToggle }: CandidateReviewQueueProps) {
  if (!candidates.length) return <div className="border border-dashed border-border p-8 text-center text-sm text-text-muted">还没有候选区间。返回准备阶段运行一次真实扫描。</div>
  return <div className="divide-y divide-border border border-border">{candidates.map((candidate, index) => { const included = !excludedCandidateIds.includes(candidate.id); return <div key={candidate.id} className={`flex items-center gap-3 px-3 py-2.5 ${selectedCandidateId === candidate.id ? "bg-accent/10" : "bg-bg-panel"}`}><button type="button" onClick={() => onSelect(candidate)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${included ? "border-accent/50 text-accent" : "border-border text-text-muted"}`}>{included ? <Check className="size-3" /> : <X className="size-3" />}</span><span className="min-w-0"><span className="block truncate text-xs text-text-base">候选 {String(index + 1).padStart(2, "0")} · {candidate.kind === "hard-cut" ? "硬切" : candidate.kind === "fade" ? "淡入淡出" : "尾段"}</span><span className="mt-0.5 block font-mono text-[10px] text-text-muted">帧 {candidate.startFrame}–{candidate.endFrame - 1} · score {candidate.score.toFixed(3)}</span></span></button><Button type="button" variant="ghost" size="icon-xs" aria-label={`定位候选 ${index + 1}`} onClick={() => onSelect(candidate)} className="text-text-muted hover:text-accent"><Eye className="size-3.5" /></Button><Button type="button" variant="outline" size="xs" onClick={() => onToggle(candidate.id, !included)} className="border-border text-text-muted">{included ? "排除" : "保留"}</Button></div> })}</div>
}
