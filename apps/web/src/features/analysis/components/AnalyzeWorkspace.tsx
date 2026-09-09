import { memo, type ReactNode } from "react"
import { Button } from "../../../components/ui/button"
import type { ShotData } from "../../editor/constants/editorData.ts"
import type { ShotGroupRecord } from "../../group/types"
import ShotBrowserView from "../../shot/components/ShotBrowserView"
import ContextInspector from "./ContextInspector"
import SoundWorkspace from "../../media/components/SoundWorkspace"
import type { ProjectRecord } from "../../project/types"
import type { WorkflowView } from "../../workflow/types.ts"
import { useMemo } from "react"
import { useProjectSession } from "../../editor/session/ProjectSessionProvider"

interface AnalyzeWorkspaceProps { view: WorkflowView; children: ReactNode; shots: ShotData[]; groups: ShotGroupRecord[]; activeShotIndex: number; selectedGroupId?: string | null; notes: Record<string, { content: string; analysis: string }>; project: ProjectRecord; frameRate: number; currentFrame: number; onViewChange: (view: "scenes" | "shots" | "sound") => void; onLocateShot: (index: number) => void; onPlayShot: (index: number) => void; onChangeNotes: (patch: { content?: string; analysis?: string }) => void; onProjectUpdated: (project: ProjectRecord) => void }

function AnalyzeWorkspace({ view, children, shots, groups, activeShotIndex, selectedGroupId = null, notes, project, frameRate, currentFrame, onViewChange, onLocateShot, onPlayShot, onChangeNotes, onProjectUpdated }: AnalyzeWorkspaceProps) {
  const researchMode = useProjectSession((state) => state.researchMode)
  const researchScope = useProjectSession((state) => state.researchScope)
  const setResearchMode = useProjectSession((state) => state.setResearchMode)
  const setResearchScope = useProjectSession((state) => state.setResearchScope)
  const activeShot = shots[activeShotIndex] ?? null
  const activeGroup = selectedGroupId ? groups.find((group) => group.id === selectedGroupId) ?? null : null
  const scopeShotIds = useMemo(() => {
    if (researchMode !== "range") return undefined
    if (researchScope.kind === "group" && researchScope.id) return groups.find((group) => group.id === researchScope.id)?.shotIds ?? []
    if (researchScope.fromUs === undefined || researchScope.toUs === undefined) return undefined
    return shots.filter((shot) => shot.start * 1_000_000 < researchScope.toUs! && (shot.start + shot.duration) * 1_000_000 > researchScope.fromUs!).map((shot) => shot.id)
  }, [groups, researchMode, researchScope, shots])
  const currentView = view === "shots" || view === "sound" ? view : "scenes"
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-bg"><div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border bg-bg-nav px-3 py-2" role="tablist" aria-label="深拆视图"><span className="mr-3 shrink-0 font-mono text-[10px] uppercase tracking-wider text-text-muted">Analyze</span>{(["scenes", "shots", "sound"] as const).map((item) => <Button key={item} type="button" variant="ghost" size="sm" role="tab" aria-selected={currentView === item} onClick={() => onViewChange(item)} className={currentView === item ? "shrink-0 bg-accent/15 text-accent" : "shrink-0 text-text-muted"}>{item === "scenes" ? "Scenes" : item === "shots" ? "Shots" : "Sound"}</Button>)}<span className="mx-1 hidden h-4 w-px bg-border sm:block" aria-hidden="true" /><span className="text-xs text-text-muted">研究模式</span><Button type="button" variant="ghost" size="sm" aria-pressed={researchMode === "sequential"} onClick={() => { setResearchMode("sequential"); setResearchScope({ kind: "full-film" }) }} className={researchMode === "sequential" ? "bg-accent/15 text-accent" : "text-text-muted"}>逐镜</Button><Button type="button" variant="ghost" size="sm" aria-pressed={researchMode === "range"} onClick={() => setResearchMode("range")} className={researchMode === "range" ? "bg-accent/15 text-accent" : "text-text-muted"}>选段</Button>{researchMode === "range" && <span className="ml-auto text-[11px] text-text-muted">{scopeShotIds ? `${scopeShotIds.length} 镜在当前范围` : "当前为媒体时间范围"}</span>}</div>{currentView === "scenes" && <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>}{currentView === "shots" && <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row"><ShotBrowserView shots={shots} activeShotIndex={activeShotIndex} scopeShotIds={scopeShotIds} notes={notes} onLocateShot={onLocateShot} onPlayShot={onPlayShot} /><ContextInspector targetKind={activeGroup ? "group" : "shot"} className="basis-1/2 overflow-y-auto border-t border-border lg:w-80 lg:flex-none lg:basis-auto lg:overflow-hidden lg:border-t-0" shot={activeShot} shotIndex={activeShotIndex} notes={notes[activeShot?.id ?? ""] ?? { content: "", analysis: "" }} group={activeGroup} onChangeNotes={onChangeNotes} /></div>}{currentView === "sound" && <SoundWorkspace project={project} frameRate={frameRate} currentFrame={currentFrame} onProjectUpdated={onProjectUpdated} />}</div>
}

const areAnalyzeWorkspacePropsEqual = (previous: AnalyzeWorkspaceProps, next: AnalyzeWorkspaceProps) => {
  if (previous.view !== next.view) return false
  if (next.view === "shots") {
    return previous.shots === next.shots && previous.groups === next.groups && previous.activeShotIndex === next.activeShotIndex && previous.selectedGroupId === next.selectedGroupId && previous.notes === next.notes
  }
  if (next.view === "sound") {
    return previous.project === next.project && previous.frameRate === next.frameRate && previous.currentFrame === next.currentFrame
  }
  return false
}

export default memo(AnalyzeWorkspace, areAnalyzeWorkspacePropsEqual)
