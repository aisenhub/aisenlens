import { ArrowRight, ImageOff } from "lucide-react"
import { Button } from "../../../components/ui/button"
import type { ShotGroupRecord } from "../types"

interface SceneBoardProps { groups: ShotGroupRecord[]; shotIndexById: Map<string, number>; kind?: ShotGroupRecord["kind"]; onOpenScene: (group: ShotGroupRecord) => void }

export default function SceneBoard({ groups, shotIndexById, kind = "scene", onOpenScene }: SceneBoardProps) {
  const label = kind === "scene" ? "场景" : kind === "sequence" ? "序列" : "段落"
  const scenes = groups.filter((group) => group.kind === kind).sort((left, right) => (shotIndexById.get(left.shotIds[0]) ?? 0) - (shotIndexById.get(right.shotIds[0]) ?? 0))
  if (!scenes.length) return <div className="border border-dashed border-border p-8 text-center text-sm text-text-muted">还没有人工{label}。可从一个或多个连续镜头开始建立结构。</div>
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{scenes.map((scene) => <article key={scene.id} className={`border bg-bg-panel p-3 ${scene.validity?.status === "needs-review" ? "border-amber-400/40" : "border-border"}`}><div className="flex aspect-video items-center justify-center bg-bg-deep text-text-muted"><ImageOff className="size-5" /></div><div className="mt-3 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-medium text-text-base">{scene.title}</h3><p className="mt-1 font-mono text-[10px] text-text-muted">{scene.shotIds.length} 镜 · #{(shotIndexById.get(scene.shotIds[0]) ?? 0) + 1}–#{(shotIndexById.get(scene.shotIds.at(-1) ?? "") ?? 0) + 1}</p></div><Button type="button" variant="ghost" size="icon-xs" aria-label={`打开${scene.title}`} onClick={() => onOpenScene(scene)} className="text-text-muted hover:text-accent"><ArrowRight className="size-3.5" /></Button></div>{scene.validity?.status === "needs-review" && <p className="mt-2 text-xs text-amber-200">待复核：{scene.validity.reason}</p>}{scene.summary && <p className="mt-3 line-clamp-3 text-xs leading-5 text-text-muted">{scene.summary}</p>}</article>)}</div>
}
