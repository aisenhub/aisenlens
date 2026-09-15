import { memo, useEffect, useMemo, useState, type ReactNode } from "react"
import { Bookmark, Grid3X3 } from "lucide-react"
import { Button } from "../../../components/ui/button"
import type { ShotData } from "../../editor/constants/editorData.ts"
import type { ShotGroupRecord } from "../../group/types"
import ShotBrowserView from "../../shot/components/ShotBrowserView"
import ContextInspector from "./ContextInspector"
import SoundWorkspace from "../../media/components/SoundWorkspace"
import type { ProjectRecord } from "../../project/types"
import type { WorkflowView } from "../../workflow/types.ts"
import { useProjectSession } from "../../editor/session/ProjectSessionProvider"
import type { AnalysisFieldEntry, ResolvedAnalysisProfile } from "../../template/types"
import type { EvidenceRef, ResearchContext, ResearchRange, ResearchTarget } from "../types.ts"
import type { AnalysisFieldCommand } from "../services/analysisFieldCommands"
import RangeInspector from "./RangeInspector"
import FocusAnalysisMode from "./FocusAnalysisMode"
import ResearchContextPanel from "./ResearchContextPanel"

interface AnalyzeWorkspaceProps {
  view: WorkflowView
  children: ReactNode
  shots: ShotData[]
  groups: ShotGroupRecord[]
  activeShotIndex: number
  selectedGroupId?: string | null
  notes: Record<string, { content: string; analysis: string }>
  entries: Record<string, Record<string, AnalysisFieldEntry>>
  resolvedProfile: ResolvedAnalysisProfile | null
  project: ProjectRecord
  frameRate: number
  currentFrame: number
  currentTime: number
  mediaIdentityDigest: string
  researchTarget: ResearchTarget | null
  researchRanges: ResearchRange[]
  researchContexts: ResearchContext[]
  firstScreenshotId?: string | null
  lastScreenshotId?: string | null
  onViewChange: (view: "scenes" | "shots" | "sound") => void
  activeTool: "mask" | "markers" | null
  onToggleTool: (tool: "mask" | "markers") => void
  onLocateShot: (index: number) => void
  onPlayShot: (index: number) => void
  onChangeNotes: (patch: { content?: string; analysis?: string }) => void
  onAnalysisFieldCommand: (command: AnalysisFieldCommand) => void
  onCopyPreviousAnalysis: (fieldId: string, previousShotId: string) => void
  onEditingStart?: () => void
  onEditingEnd?: () => void
  onUpdateResearchContext: (target: ResearchTarget, patch: Partial<Pick<ResearchContext, "question" | "status" | "needsReview">>) => Promise<void>
  onAddEvidence: (target: ResearchTarget, evidence: EvidenceRef) => void
  onRemoveEvidence: (target: ResearchTarget, evidenceId: string) => void
  onCreateResearchRange: (startUs: number, endUs: number) => Promise<ResearchRange | null>
  onUpdateResearchRange: (range: ResearchRange, patch: Partial<Pick<ResearchRange, "startUs" | "endUs" | "title" | "observation" | "interpretation" | "summary">>) => Promise<void>
  onProjectUpdated: (project: ProjectRecord) => void
  onSaveAndNext?: () => Promise<void>
  isResearchSaving?: boolean
  researchError?: string | null
}

function AnalyzeWorkspace({ view, children, shots, groups, activeShotIndex, selectedGroupId = null, notes, entries, resolvedProfile, project, frameRate, currentFrame, currentTime, mediaIdentityDigest, researchTarget, researchRanges, researchContexts, firstScreenshotId, lastScreenshotId, onViewChange, activeTool, onToggleTool, onLocateShot, onPlayShot, onChangeNotes, onAnalysisFieldCommand, onCopyPreviousAnalysis, onEditingStart, onEditingEnd, onUpdateResearchContext, onAddEvidence, onRemoveEvidence, onCreateResearchRange, onUpdateResearchRange, onProjectUpdated, onSaveAndNext, isResearchSaving = false, researchError = null }: AnalyzeWorkspaceProps) {
  const researchScope = useProjectSession((state) => state.researchScope)
  const sessionTargetValue = useProjectSession((state) => state.researchTarget)
  const sessionTarget: ResearchTarget | null = sessionTargetValue && (sessionTargetValue.kind === "shot" || sessionTargetValue.kind === "group" || sessionTargetValue.kind === "range") ? { kind: sessionTargetValue.kind, id: sessionTargetValue.id } : null
  const activeShot = shots[activeShotIndex] ?? null
  const activeGroup = selectedGroupId ? groups.find((group) => group.id === selectedGroupId) ?? null : null
  const target = researchTarget ?? sessionTarget ?? (activeGroup ? { kind: "group" as const, id: activeGroup.id } : activeShot ? { kind: "shot" as const, id: activeShot.id } : null)
  const targetContext = target ? researchContexts.find((context) => context.target.kind === target.kind && context.target.id === target.id) ?? null : null
  const orphanContexts = useMemo(() => researchContexts.filter((context) => (context.target.kind === "group" && !groups.some((group) => group.id === context.target.id)) || (context.target.kind === "shot" && !shots.some((shot) => shot.id === context.target.id))), [groups, researchContexts, shots])
  const [selectedOrphanContextId, setSelectedOrphanContextId] = useState<string | null>(null)
  useEffect(() => {
    if (target?.kind === "group" && !activeGroup && targetContext) setSelectedOrphanContextId(targetContext.id)
    else if (selectedOrphanContextId && !orphanContexts.some((context) => context.id === selectedOrphanContextId)) setSelectedOrphanContextId(null)
  }, [activeGroup, orphanContexts, selectedOrphanContextId, target, targetContext])
  const selectedOrphanContext = orphanContexts.find((context) => context.id === selectedOrphanContextId) ?? null
  const activeRange = target?.kind === "range" ? researchRanges.find((range) => range.id === target.id) ?? null : null
  const scopeShotIds = useMemo(() => {
    if (researchScope.kind === "full-film") return undefined
    if (researchScope.kind === "group" && researchScope.id) return groups.find((group) => group.id === researchScope.id)?.shotIds ?? []
    if (researchScope.fromUs === undefined || researchScope.toUs === undefined) return undefined
    return shots.filter((shot) => shot.start * 1_000_000 < researchScope.toUs! && (shot.start + shot.duration) * 1_000_000 > researchScope.fromUs!).map((shot) => shot.id)
  }, [groups, researchScope, shots])
  const currentView = view === "shots" || view === "sound" ? view : "scenes"
  const [analysisMode, setAnalysisMode] = useState<"detail" | "focus">("detail")
  const focusQueue = scopeShotIds ?? shots.map((shot) => shot.id)
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-bg">
    <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border bg-bg-nav px-3 py-2" role="tablist" aria-label="深拆视图">
      <span className="mr-3 shrink-0 font-mono text-[10px] uppercase tracking-wider text-text-muted">Analyze</span>
      {(["scenes", "shots", "sound"] as const).map((item) => <Button key={item} type="button" variant="ghost" size="sm" role="tab" aria-selected={currentView === item} onClick={() => onViewChange(item)} className={currentView === item ? "shrink-0 bg-accent/15 text-accent" : "shrink-0 text-text-muted"}>{item === "scenes" ? "Scenes" : item === "shots" ? "Shots" : "Sound"}</Button>)}
      {currentView === "shots" && <><span className="mx-1 hidden h-4 w-px bg-border sm:block" aria-hidden="true" /><Button type="button" variant="ghost" size="sm" aria-pressed={analysisMode === "detail"} onClick={() => setAnalysisMode("detail")} className={analysisMode === "detail" ? "bg-accent/15 text-accent" : "text-text-muted"}>详情</Button><Button type="button" variant="ghost" size="sm" aria-pressed={analysisMode === "focus"} onClick={() => setAnalysisMode("focus")} className={analysisMode === "focus" ? "bg-accent/15 text-accent" : "text-text-muted"}>Focus</Button></>}
      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
      <Button type="button" variant="ghost" size="sm" aria-pressed={activeTool === "markers"} aria-label="时间线标记" onClick={() => onToggleTool("markers")} className={activeTool === "markers" ? "shrink-0 gap-1.5 bg-accent/15 text-accent" : "shrink-0 gap-1.5 text-text-muted"}><Bookmark className="size-3.5" strokeWidth={1.7} />标记</Button>
      <Button type="button" variant="ghost" size="sm" aria-pressed={activeTool === "mask"} aria-label="视频蒙版" onClick={() => onToggleTool("mask")} className={activeTool === "mask" ? "shrink-0 gap-1.5 bg-accent/15 text-accent" : "shrink-0 gap-1.5 text-text-muted"}><Grid3X3 className="size-3.5" strokeWidth={1.7} />蒙版</Button>
       {researchScope.kind !== "full-film" && <span className="ml-auto text-[11px] text-text-muted">{scopeShotIds ? `${scopeShotIds.length} 镜在当前范围` : "当前为媒体时间范围"}</span>}
      {isResearchSaving && <span className="text-[11px] text-accent">研究保存中…</span>}
     {researchError && <span role="alert" className="max-w-64 truncate text-[11px] text-red-300" title={researchError}>研究保存失败：{researchError}</span>}
     </div>
     {orphanContexts.length > 0 && <section className="shrink-0 border-b border-amber-300/20 bg-amber-300/5 px-3 py-2"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-amber-200">{orphanContexts.length} 条研究待复核</span><span className="text-[11px] text-text-muted">目标镜头或结构已被删除或合并，研究内容仍保留。</span>{orphanContexts.map((context) => <Button key={context.id} type="button" variant={selectedOrphanContextId === context.id ? "secondary" : "ghost"} size="xs" onClick={() => setSelectedOrphanContextId(context.id)} className="h-7 text-[11px]">查看 {context.target.kind === "shot" ? "镜头" : "结构"} {context.target.id.slice(0, 12)}</Button>)}</div>{selectedOrphanContext && <div className="mt-2 max-w-xl border-t border-amber-300/15 pt-2"><ResearchContextPanel projectId={project.id} target={selectedOrphanContext.target} context={selectedOrphanContext} mediaIdentityDigest={mediaIdentityDigest} currentTime={currentTime} onUpdate={(patch) => onUpdateResearchContext(selectedOrphanContext.target, patch)} onAddEvidence={(evidence) => onAddEvidence(selectedOrphanContext.target, evidence)} onRemoveEvidence={(evidenceId) => onRemoveEvidence(selectedOrphanContext.target, evidenceId)} /></div>}</section>}
     <div className={currentView === "scenes" ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" : "hidden"}>{children}</div>
     {currentView === "shots" && (analysisMode === "focus" ? <FocusAnalysisMode profile={resolvedProfile} entries={entries} shots={shots} activeShotId={activeShot?.id ?? null} queue={focusQueue} onLocateShot={onLocateShot} onCommand={onAnalysisFieldCommand} onCopyPrevious={onCopyPreviousAnalysis} onExit={() => setAnalysisMode("detail")} onEditingStart={onEditingStart} onEditingEnd={onEditingEnd} /> : <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row"><ShotBrowserView shots={shots} activeShotIndex={activeShotIndex} scopeShotIds={scopeShotIds} notes={notes} onLocateShot={onLocateShot} onPlayShot={onPlayShot} onSaveAndNext={onSaveAndNext} queuePosition={scopeShotIds ? Math.max(0, scopeShotIds.indexOf(activeShot?.id ?? "")) : activeShotIndex} queueLength={scopeShotIds?.length ?? shots.length} isResearchSaving={isResearchSaving} /><>{target?.kind === "range" ? <RangeInspector range={activeRange} context={targetContext} mediaIdentityDigest={mediaIdentityDigest} currentTime={currentTime} onCreate={async (startUs, endUs) => onCreateResearchRange(startUs, endUs)} onUpdateRange={onUpdateResearchRange} onUpdateContext={(patch) => onUpdateResearchContext(target, patch)} onAddEvidence={(evidence) => onAddEvidence(target, evidence)} onRemoveEvidence={(evidenceId) => onRemoveEvidence(target, evidenceId)} /> : target?.kind === "group" && !activeGroup ? null : <ContextInspector projectId={project.id} targetKind={target?.kind === "group" ? "group" : "shot"} target={target} context={targetContext} profile={resolvedProfile} entries={entries[activeShot?.id ?? ""] ?? {}} mediaIdentityDigest={mediaIdentityDigest} currentTime={currentTime} firstScreenshotId={firstScreenshotId} lastScreenshotId={lastScreenshotId} className="basis-1/2 overflow-y-auto border-t border-border lg:w-80 lg:flex-none lg:basis-auto lg:overflow-hidden lg:border-t-0" shot={activeShot} shotIndex={activeShotIndex} notes={notes[activeShot?.id ?? ""] ?? { content: "", analysis: "" }} group={activeGroup} onChangeNotes={onChangeNotes} onAnalysisFieldCommand={onAnalysisFieldCommand} onEditingStart={onEditingStart} onEditingEnd={onEditingEnd} onUpdateContext={(patch) => target ? onUpdateResearchContext(target, patch) : Promise.resolve()} onAddEvidence={(evidence) => target && onAddEvidence(target, evidence)} onRemoveEvidence={(evidenceId) => target && onRemoveEvidence(target, evidenceId)} />}</></div>)}
    {currentView === "sound" && <SoundWorkspace project={project} frameRate={frameRate} currentFrame={currentFrame} currentTime={currentTime} mediaIdentityDigest={mediaIdentityDigest} researchTarget={target} researchRange={activeRange} researchContext={targetContext} onCreateResearchRange={onCreateResearchRange} onUpdateResearchRange={onUpdateResearchRange} onUpdateResearchContext={onUpdateResearchContext} onAddEvidence={(evidence) => { if (target) onAddEvidence(target, evidence) }} onRemoveEvidence={(evidenceId) => { if (target) onRemoveEvidence(target, evidenceId) }} onProjectUpdated={onProjectUpdated} />}
  </div>
}

const areAnalyzeWorkspacePropsEqual = (previous: AnalyzeWorkspaceProps, next: AnalyzeWorkspaceProps) => previous.view === next.view && previous.activeTool === next.activeTool && previous.shots === next.shots && previous.groups === next.groups && previous.activeShotIndex === next.activeShotIndex && previous.selectedGroupId === next.selectedGroupId && previous.notes === next.notes && previous.entries === next.entries && previous.resolvedProfile === next.resolvedProfile && previous.project === next.project && previous.researchTarget === next.researchTarget && previous.researchRanges === next.researchRanges && previous.researchContexts === next.researchContexts && previous.currentTime === next.currentTime && previous.researchError === next.researchError && previous.isResearchSaving === next.isResearchSaving

export default memo(AnalyzeWorkspace, areAnalyzeWorkspacePropsEqual)
