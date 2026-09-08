import type { AutoShotCandidate } from "../types"

interface CandidateEvidencePanelProps { candidate: AutoShotCandidate | null; frameRate: number }

export default function CandidateEvidencePanel({ candidate, frameRate }: CandidateEvidencePanelProps) {
  if (!candidate) return <section className="flex min-h-48 items-center justify-center border border-border bg-bg-deep p-6 text-center text-xs text-text-muted">选择一个候选区间查看真实边界信息。</section>
  const transition = candidate.transitionRange ? `真实转场范围 ${candidate.transitionRange.start.timestampUs}–${candidate.transitionRange.end.timestampUs} μs` : "无独立转场范围"
  return <section className="border border-border bg-bg-deep p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-medium text-text-base">候选证据</h2><span className="font-mono text-xs text-text-muted">{candidate.kind}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-text-muted">起始帧</dt><dd className="mt-1 font-mono text-text-dim">{candidate.startFrame}</dd></div><div><dt className="text-text-muted">结束帧（不含）</dt><dd className="mt-1 font-mono text-text-dim">{candidate.endFrame}</dd></div><div><dt className="text-text-muted">时间范围</dt><dd className="mt-1 font-mono text-text-dim">{(candidate.startFrame / frameRate).toFixed(3)}–{(candidate.endFrame / frameRate).toFixed(3)} s</dd></div><div><dt className="text-text-muted">检测分数</dt><dd className="mt-1 font-mono text-text-dim">{candidate.score.toFixed(4)} / threshold {candidate.threshold.toFixed(4)}</dd></div></dl><p className="mt-4 border-t border-border pt-3 text-xs leading-5 text-text-muted">{transition}。这里展示检测结果的真实字段，不将分数解释为概率或准确率。</p></section>
}
