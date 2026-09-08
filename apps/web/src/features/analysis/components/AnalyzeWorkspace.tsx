import type { ReactNode } from "react"
import { Button } from "../../../components/ui/button"
import type { ShotData } from "../../editor/constants/editorData.ts"
import type { ShotGroupRecord } from "../../group/types"
import ShotBrowserView from "../../shot/components/ShotBrowserView"
import ContextInspector from "./ContextInspector"
import SoundWorkspace from "../../media/components/SoundWorkspace"
import type { ProjectRecord } from "../../project/types"
import type { WorkflowView } from "../../workflow/types.ts"

interface AnalyzeWorkspaceProps { view: WorkflowView; children: ReactNode; shots: ShotData[]; groups: ShotGroupRecord[]; activeShotIndex: number; notes: Record<string, { content: string; analysis: string }>; project: ProjectRecord; frameRate: number; currentFrame: number; onViewChange: (view: "scenes" | "shots" | "sound") => void; onLocateShot: (index: number) => void; onPlayShot: (index: number) => void; onChangeNotes: (patch: { content?: string; analysis?: string }) => void; onProjectUpdated: (project: ProjectRecord) => void }

export default function AnalyzeWorkspace({ view, children, shots, groups, activeShotIndex, notes, project, frameRate, currentFrame, onViewChange, onLocateShot, onPlayShot, onChangeNotes, onProjectUpdated }: AnalyzeWorkspaceProps) {
  const activeShot = shots[activeShotIndex] ?? null
  const activeGroup = activeShot ? groups.find((group) => group.shotIds.includes(activeShot.id)) ?? null : null
  const currentView = view === "shots" || view === "sound" ? view : "scenes"
  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-bg"><div className="flex shrink-0 items-center gap-1 border-b border-border bg-bg-nav px-3 py-2" role="tablist" aria-label="深拆视图"><span className="mr-3 font-mono text-[10px] uppercase tracking-wider text-text-muted">Analyze</span>{(["scenes", "shots", "sound"] as const).map((item) => <Button key={item} type="button" variant="ghost" size="sm" role="tab" aria-selected={currentView === item} onClick={() => onViewChange(item)} className={currentView === item ? "bg-accent/15 text-accent" : "text-text-muted"}>{item === "scenes" ? "Scenes" : item === "shots" ? "Shots" : "Sound"}</Button>)}</div>{currentView === "scenes" && <div className="min-h-0 flex-1 overflow-hidden">{children}</div>}{currentView === "shots" && <div className="flex min-h-0 flex-1 flex-col lg:flex-row"><ShotBrowserView shots={shots} activeShotIndex={activeShotIndex} notes={notes} onLocateShot={onLocateShot} onPlayShot={onPlayShot} /><ContextInspector shot={activeShot} shotIndex={activeShotIndex} notes={notes[activeShot?.id ?? ""] ?? { content: "", analysis: "" }} group={activeGroup} onChangeNotes={onChangeNotes} /></div>}{currentView === "sound" && <SoundWorkspace project={project} frameRate={frameRate} currentFrame={currentFrame} onProjectUpdated={onProjectUpdated} />}</div>
}
