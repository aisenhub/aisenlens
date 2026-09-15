import { useMemo } from "react"
import { Button } from "../../../components/ui/button"
import FilmFacts from "./FilmFacts"
import FilmMap from "./FilmMap"
import StructureView from "./StructureView"
import deriveFilmOverview from "../services/deriveFilmOverview"
import type { ShotData } from "../../editor/constants/editorData.ts"
import type { AnnotationMarker } from "../../annotation/types"
import type { ShotGroupRecord } from "../../group/types"
import type { WorkflowView } from "../../workflow/types.ts"

interface OverviewViewProps { view: WorkflowView; shots: ShotData[]; shotFrames: Record<string, { first: number; last: number }>; groups: ShotGroupRecord[]; markers: AnnotationMarker[]; durationSeconds: number; frameRate: number | null; selectedShotId?: string | null; onViewChange: (view: "film" | "structure") => void; onSelectShot: (index: number) => void; onOpenScene: (group: ShotGroupRecord) => void; onStartSelection: () => void }

export default function OverviewView({ view, shots, shotFrames, groups, markers, durationSeconds, frameRate, selectedShotId = null, onViewChange, onSelectShot, onOpenScene, onStartSelection }: OverviewViewProps) {
  const facts = useMemo(() => deriveFilmOverview({ shots, shotFrames, groups, markers, durationSeconds, frameRate }), [durationSeconds, frameRate, groups, markers, shotFrames, shots])
  const shotIndexById = useMemo(() => new Map(shots.map((shot, index) => [shot.id, index])), [shots])
  const structure = view === "structure"
  const selectedShot = selectedShotId ? shots.find((shot) => shot.id === selectedShotId) ?? null : null
  return <main className="min-h-0 flex-1 overflow-y-auto bg-bg px-4 py-5 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">Overview</p><h1 className="mt-1 text-xl font-semibold text-text-base">全片结构与节奏</h1><p className="mt-2 text-sm text-text-muted">先在全片地图定位和预览镜头，再进入深拆；总览视图不会因单击自动跳页。</p></div><div className="flex gap-1 border border-border p-1"><Button type="button" variant="ghost" size="sm" onClick={() => onViewChange("film")} className={structure ? "text-text-muted" : "bg-accent/15 text-accent"}>Film Map</Button><Button type="button" variant="ghost" size="sm" onClick={() => onViewChange("structure")} className={structure ? "bg-accent/15 text-accent" : "text-text-muted"}>Structure</Button></div></div>{!structure && <div className="space-y-5"><FilmFacts facts={facts} frameRate={frameRate} /><FilmMap facts={facts} selectedShotId={selectedShotId} onSelectShot={onSelectShot} />{selectedShot && <section className="border border-accent/30 bg-bg-panel p-4"><p className="font-mono text-[10px] uppercase tracking-wider text-accent">已选镜头 #{String((shotIndexById.get(selectedShot.id) ?? 0) + 1).padStart(2, "0")}</p><p className="mt-1 text-sm text-text-base">{selectedShot.start.toFixed(2)}–{(selectedShot.start + selectedShot.duration).toFixed(2)} s · {selectedShot.type || "未分析"}</p><p className="mt-1 text-xs text-text-muted">进入深拆后将自动定位当前镜头。</p></section>}</div>}{structure && <StructureView groups={groups} shotIndexById={shotIndexById} onOpenScene={onOpenScene} onStartSelection={onStartSelection} />}</div></main>
}
