import type { FilmOverviewFacts } from "../services/deriveFilmOverview"

interface FilmMapProps { facts: FilmOverviewFacts; selectedShotId?: string | null; onSelectShot: (index: number) => void }

export default function FilmMap({ facts, selectedShotId = null, onSelectShot }: FilmMapProps) {
  if (!facts.segments.length) return <div className="border border-dashed border-border p-10 text-center text-sm text-text-muted">尚未建立正式镜头。返回准备阶段运行检测，或在深拆中手工处理。</div>
  const total = (facts.totalDurationSeconds ?? facts.segments.reduce((sum, segment) => sum + segment.durationSeconds, 0)) || 1
  return <div className="overflow-x-auto border border-border bg-bg-deep p-3"><div className="flex min-w-[640px] gap-0.5" aria-label="全片镜头地图">{facts.segments.map((segment) => <button key={segment.id} type="button" onClick={() => onSelectShot(segment.index)} aria-pressed={segment.id === selectedShotId} aria-label={`定位镜头 ${segment.index + 1}`} className={`group relative h-20 min-w-1 overflow-hidden border transition-colors ${segment.id === selectedShotId ? "border-accent bg-accent/45" : "border-transparent bg-[var(--timeline-shot)] hover:border-accent/70"}`} style={{ width: `${Math.max(1, (segment.durationSeconds / total) * 100)}%` }}><span className="absolute inset-x-0 bottom-1 truncate px-1 text-[9px] font-mono text-text-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">{String(segment.index + 1).padStart(2, "0")}</span></button>)}</div><div className="mt-2 flex justify-between font-mono text-[10px] text-text-muted"><span>00:00:00</span><span>{facts.totalDurationSeconds ? `${facts.totalDurationSeconds.toFixed(2)} s` : "时长不可用"}</span></div></div>
}
