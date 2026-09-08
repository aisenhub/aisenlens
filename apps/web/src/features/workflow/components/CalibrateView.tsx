import { ArrowRight, RotateCcw } from "lucide-react"
import { Button } from "../../../components/ui/button"
import CandidateEvidencePanel from "../../auto-shot/components/CandidateEvidencePanel"
import CandidateReviewQueue from "../../auto-shot/components/CandidateReviewQueue"
import type { AutoShotCandidate, AutoShotTaskRecord } from "../../auto-shot/types"

interface CalibrateViewProps {
  record: AutoShotTaskRecord | null
  excludedCandidateIds: string[]
  selectedCandidate: AutoShotCandidate | null
  frameRate: number
  onSelectCandidate: (candidate: AutoShotCandidate) => void
  onToggleCandidate: (candidateId: string, included: boolean) => void
  onPreviewApply: () => void
  onBackToPrepare: () => void
}

export default function CalibrateView({ record, excludedCandidateIds, selectedCandidate, frameRate, onSelectCandidate, onToggleCandidate, onPreviewApply, onBackToPrepare }: CalibrateViewProps) {
  const includedCount = record?.candidates.filter((candidate) => !excludedCandidateIds.includes(candidate.id)).length ?? 0
  return <main className="min-h-0 flex-1 overflow-y-auto bg-bg px-4 py-5 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">Calibrate</p><h1 className="mt-1 text-xl font-semibold text-text-base">复核候选镜头</h1><p className="mt-2 text-sm text-text-muted">只修改保留/排除选择；正式镜头会在应用事务成功后更新。</p></div><Button type="button" variant="outline" size="sm" onClick={onBackToPrepare} className="gap-2 border-border text-text-dim"><RotateCcw className="size-3.5" />返回准备</Button></div><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]"><div><div className="mb-2 flex items-center justify-between text-xs"><span className="text-text-muted">{record ? `${record.candidates.length} 个候选区间` : "尚无扫描结果"}</span><span className="font-mono text-text-dim">保留 {includedCount}</span></div><CandidateReviewQueue candidates={record?.candidates ?? []} excludedCandidateIds={excludedCandidateIds} selectedCandidateId={selectedCandidate?.id ?? null} onSelect={onSelectCandidate} onToggle={onToggleCandidate} /></div><div className="space-y-4"><CandidateEvidencePanel candidate={selectedCandidate} frameRate={frameRate} /><div className="border border-border bg-bg-panel p-4"><p className="text-xs leading-5 text-text-muted">应用预览会重新基于当前候选和排除项计算。首段、中段、尾段排除会按现有引擎区间语义重整，不会删除原视频。</p><Button type="button" onClick={onPreviewApply} disabled={!record || record.status !== "completed" || includedCount === 0} className="mt-4 w-full gap-2 bg-accent text-white hover:bg-accent/90">打开应用预览<ArrowRight className="size-4" /></Button></div></div></div></div></main>
}
