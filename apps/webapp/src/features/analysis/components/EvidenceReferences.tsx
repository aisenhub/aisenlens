import { Link2, Plus, X } from "lucide-react"
import { Button } from "../../../components/ui/button"
import type { EvidenceRef, ResearchTarget } from "../types.ts"

interface EvidenceReferencesProps {
  target: ResearchTarget | null
  projectId: string
  evidence: EvidenceRef[]
  mediaIdentityDigest: string
  currentTime: number
  currentShotId?: string | null
  firstScreenshotId?: string | null
  lastScreenshotId?: string | null
  onAdd: (evidence: EvidenceRef) => void
  onRemove: (evidenceId: string) => void
}

function label(evidence: EvidenceRef) {
  if (evidence.kind === "screenshot") return `截图 · ${evidence.screenshotId.slice(0, 8)}`
  if (evidence.kind === "shot") return `镜头 · ${evidence.shotId.slice(0, 8)}`
  if (evidence.kind === "time-point") return `时间点 · ${(evidence.atUs / 1_000_000).toFixed(2)} s`
  if (evidence.kind === "time-range") return `时间段 · ${(evidence.startUs / 1_000_000).toFixed(2)}–${(evidence.endUs / 1_000_000).toFixed(2)} s`
  if (evidence.kind === "marker") return `标记 · ${evidence.markerId.slice(0, 8)}`
  return `声音 · ${(evidence.projectStartUs / 1_000_000).toFixed(2)}–${(evidence.projectEndUs / 1_000_000).toFixed(2)} s`
}

export default function EvidenceReferences({ target, projectId, evidence, mediaIdentityDigest, currentTime, currentShotId, firstScreenshotId, lastScreenshotId, onAdd, onRemove }: EvidenceReferencesProps) {
  if (!target) return null
  const add = (item: EvidenceRef) => onAdd(item)
  return <section className="border-t border-border px-4 py-4"><div className="flex items-center justify-between gap-2"><div><p className="text-xs font-medium text-text-base">Evidence references</p><p className="mt-1 text-[11px] text-text-muted">引用可独立于正文复用，媒体变化后会进入待复核。</p></div><Link2 className="size-4 text-text-muted" aria-hidden="true" /></div><div className="mt-3 flex flex-wrap gap-1.5"><Button type="button" variant="outline" size="xs" onClick={() => add({ id: crypto.randomUUID(), kind: "time-point", mediaIdentityDigest, atUs: Math.max(0, Math.round(currentTime * 1_000_000)) })}><Plus className="size-3" />当前时间</Button>{currentShotId && <Button type="button" variant="outline" size="xs" onClick={() => add({ id: crypto.randomUUID(), kind: "shot", projectId, mediaIdentityDigest, shotId: currentShotId })}><Plus className="size-3" />当前镜头</Button>}{firstScreenshotId && <Button type="button" variant="outline" size="xs" onClick={() => add({ id: crypto.randomUUID(), kind: "screenshot", projectId, mediaIdentityDigest, screenshotId: firstScreenshotId })}>首帧</Button>}{lastScreenshotId && <Button type="button" variant="outline" size="xs" onClick={() => add({ id: crypto.randomUUID(), kind: "screenshot", projectId, mediaIdentityDigest, screenshotId: lastScreenshotId })}>尾帧</Button>}</div>{evidence.length > 0 && <ul className="mt-3 space-y-1.5">{evidence.map((item) => <li key={item.id} className="flex items-center gap-2 rounded border border-border bg-bg-input px-2 py-1.5 text-[11px] text-text-dim"><span className="min-w-0 flex-1 truncate">{label(item)}</span><Button type="button" variant="ghost" size="icon-xs" onClick={() => onRemove(item.id)} aria-label="移除证据引用" className="text-text-muted hover:text-red-300"><X className="size-3" /></Button></li>)}</ul>}</section>
}
