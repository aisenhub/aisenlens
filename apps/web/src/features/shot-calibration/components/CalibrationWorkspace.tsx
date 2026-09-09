import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Check, ChevronRight, Flag, GitBranch, Redo2, Scissors, Trash2, Undo2 } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog"
import VideoPlaybackControls, { type VideoPlaybackControlsProps } from "../../editor/components/VideoPlaybackControls"
import VideoPreviewCanvas, { type VideoPreviewCanvasProps } from "../../editor/components/VideoPreviewCanvas"
import BoundaryFramePair from "./BoundaryFramePair"
import CalibrationTimeline from "./CalibrationTimeline"
import useEditorShortcuts from "../../editor/shortcuts/useEditorShortcuts"
import useCalibrationSession from "../hooks/useCalibrationSession"
import useMediaFrameTimeline from "../hooks/useMediaFrameTimeline"
import { coverageFrames, deriveCoverage } from "../services/reviewCoverageService"
import { frameToTimestamp, timestampToFrame } from "../../video/services/mediaFrameTimeService"
import type { CalibrationCommand, CalibrationCommandInput, CalibrationDraft } from "../types"
import type { AutoShotMediaIdentity } from "../../auto-shot/mediaIdentity"
import type { AutoShotTaskRecord } from "../../auto-shot/types"
import type { MediaSourceFingerprint, StoredShotRecord } from "../../project/types"

interface CalibrationWorkspaceProps {
  projectId: string
  projectUpdatedAt: string
  mediaIdentity: AutoShotMediaIdentity | null
  mediaSource: MediaSourceFingerprint | null
  videoUrl: string | null
  frameRate: number
  totalFrames: number
  durationSeconds: number
  task: AutoShotTaskRecord | null
  formalShots: readonly StoredShotRecord[]
  previewProps: VideoPreviewCanvasProps
  controlsProps: VideoPlaybackControlsProps
  onApply: (draft: CalibrationDraft) => Promise<void> | void
  onBack: () => void
}

function formatTime(frame: number, frameRate: number) {
  const seconds = frameRate > 0 ? frame / frameRate : 0
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, "0")}`
}

export default function CalibrationWorkspace({ projectId, projectUpdatedAt, mediaIdentity, mediaSource, videoUrl, frameRate, totalFrames, durationSeconds, task, formalShots, previewProps, controlsProps, onApply, onBack }: CalibrationWorkspaceProps) {
  const frameTimeline = useMediaFrameTimeline({ sourceUrl: videoUrl, mediaKey: mediaIdentity?.mediaIdentityDigest ?? "", declaredFrameRate: frameRate })
  const verifiedTotalFrames = frameTimeline.timeline?.totalFrames ?? 0
  const presentationTimestamps = useMemo(() => frameTimeline.timeline?.points.map((point) => point.timestamp), [frameTimeline.timeline])
  const presentationDurations = useMemo(() => frameTimeline.timeline?.points.map((point) => point.duration), [frameTimeline.timeline])
  const session = useCalibrationSession({ projectId, mediaIdentity, mediaSource, frameRate, totalFrames: verifiedTotalFrames, timingMode: frameTimeline.timeline?.timingMode, presentationTimestamps, presentationDurations, baseProjectUpdatedAt: projectUpdatedAt, task, shots: formalShots })
  const draft = session.draft
  const [selectedBoundaryId, setSelectedBoundaryId] = useState<string | null>(null)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [navigation, setNavigation] = useState<"shots" | "issues">("shots")
  const [isApplyOpen, setIsApplyOpen] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [issueNote, setIssueNote] = useState("")
  const playbackCoverageRef = useRef<{ lastTime: number; lastWallTime: number; startFrame: number; endFrame: number } | null>(null)

  useEffect(() => {
    if (!draft || session.state !== "ready") return
    const timer = window.setTimeout(() => { void session.save().catch(() => undefined) }, 500)
    return () => window.clearTimeout(timer)
  }, [draft, session.state])

  useEffect(() => {
    if (!draft || session.state !== "ready") return
    const frame = frameTimeline.timeline ? timestampToFrame(frameTimeline.timeline, controlsProps.currentTime) : 0
    const now = performance.now()
    if (previewProps.status === "playing") {
      const previous = playbackCoverageRef.current
      if (!previous) playbackCoverageRef.current = { lastTime: controlsProps.currentTime, lastWallTime: now, startFrame: frame, endFrame: frame + 1 }
      else {
        const wallDelta = Math.max(0, (now - previous.lastWallTime) / 1000)
        const mediaDelta = controlsProps.currentTime - previous.lastTime
        const expectedDelta = wallDelta * controlsProps.speed
        if (mediaDelta >= 0 && Math.abs(mediaDelta - expectedDelta) <= Math.max(0.35, expectedDelta * 2)) {
          previous.endFrame = Math.max(previous.endFrame, frame + 1)
          previous.lastTime = controlsProps.currentTime
          previous.lastWallTime = now
        } else {
          previous.lastTime = controlsProps.currentTime
          previous.lastWallTime = now
          previous.startFrame = frame
          previous.endFrame = frame + 1
        }
      }
      return
    }
    const previous = playbackCoverageRef.current
    playbackCoverageRef.current = null
    if (previous && previous.endFrame > previous.startFrame) dispatch({ type: "addReviewRange", startFrame: previous.startFrame, endFrame: previous.endFrame, kind: "playback" })
  }, [controlsProps.currentTime, controlsProps.speed, draft, frameTimeline.timeline, frameRate, previewProps.status, session.state, totalFrames])

  const selectedBoundary = draft?.boundaries.find((boundary) => boundary.id === selectedBoundaryId) ?? null
  const selectedSegmentIndex = draft?.segments.findIndex((segment) => segment.id === selectedSegmentId) ?? -1
  const selectedSegment = selectedSegmentIndex >= 0 ? draft?.segments[selectedSegmentIndex] ?? null : null
  const selectedBoundaryRole = selectedSegment?.endBoundaryId === selectedBoundaryId ? "结束边界" : "开始边界"
  const pendingIssues = draft?.issues.filter((issue) => issue.status === "pending") ?? []
  const playedFrames = draft ? coverageFrames(deriveCoverage(draft.reviewRanges, "playback")) : 0
  const reviewedFrames = draft ? coverageFrames(deriveCoverage(draft.reviewRanges, "explicit")) : 0
  const applySummary = useMemo(() => {
    if (!draft) return null
    const baseline = formalShots.length
    const current = draft.segments.length
    return { added: Math.max(0, current - baseline), removed: Math.max(0, baseline - current), total: current }
  }, [draft, formalShots.length])

  const dispatch = (command: CalibrationCommandInput) => {
    if (!draft || !session.dispatch) return
    session.dispatch({ ...command, expectedRevision: draft.revision } as CalibrationCommand)
  }

  const moveToFrame = (frame: number) => {
    if (!frameTimeline.timeline) return
    controlsProps.onCurrentTimeChange(frameToTimestamp(frameTimeline.timeline, Math.max(0, Math.min(verifiedTotalFrames - 1, frame))))
  }
  const seekToFrame = (frame: number) => {
    const segment = draft?.segments.find((candidate) => frame >= candidate.startFrame && frame < candidate.endFrame) ?? null
    if (segment && segment.id !== selectedSegmentId) {
      setSelectedSegmentId(segment.id)
      const boundaryId = segment.endBoundaryId ?? segment.startBoundaryId
      const boundary = boundaryId ? draft?.boundaries.find((item) => item.id === boundaryId) : null
      setSelectedBoundaryId(boundary?.id ?? null)
    }
    moveToFrame(frame)
  }
  const selectSegment = (segment: CalibrationDraft["segments"][number]) => {
    setSelectedSegmentId(segment.id)
    const boundaryId = segment.endBoundaryId ?? segment.startBoundaryId
    const boundary = boundaryId ? draft?.boundaries.find((item) => item.id === boundaryId) : null
    setSelectedBoundaryId(boundary?.id ?? null)
    moveToFrame(segment.startFrame)
  }
  const splitAtPlayhead = () => {
    if (!draft) return
    if (!frameTimeline.timeline) return
    const currentFrame = timestampToFrame(frameTimeline.timeline, controlsProps.currentTime)
    dispatch({ type: "splitAtFrame", frame: currentFrame })
    moveToFrame(currentFrame)
  }
  const addIssue = () => {
    if (!draft) return
    if (!frameTimeline.timeline) return
    const frame = timestampToFrame(frameTimeline.timeline, controlsProps.currentTime)
    dispatch({ type: "addReviewIssue", frame, note: issueNote })
    setIssueNote("")
    setNavigation("issues")
  }
  useEditorShortcuts({
    "shot.splitAtPlayhead": splitAtPlayhead,
    "marker.create": addIssue,
    "history.undo": session.undo,
    "history.redo": session.redo,
    "editing.delete": selectedBoundary ? () => {
      dispatch({ type: "removeBoundary", boundaryId: selectedBoundary.id })
      setSelectedBoundaryId(null)
    } : undefined,
  })
  const apply = async () => {
    if (!draft) return
    setIsApplying(true)
    try { await session.save(); await onApply(draft); setIsApplyOpen(false) } catch (error) { toast.error(error instanceof Error ? error.message : "应用失败，草稿仍可恢复。") } finally { setIsApplying(false) }
  }

  if (frameTimeline.status === "loading") return <main className="flex flex-1 items-center justify-center bg-bg-deep p-6 text-sm text-text-muted"><div className="rounded-xl border border-border bg-bg-panel px-5 py-4 text-center"><p className="text-text-base">正在验证媒体帧时间基准…</p><p className="mt-1 text-xs text-text-muted">读取 presentation timestamp，完成后才允许精确补切。</p></div></main>
  if (frameTimeline.status === "error") return <main className="flex flex-1 items-center justify-center bg-bg-deep p-6"><div className="max-w-md rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100"><p className="font-medium">无法验证精确帧</p><p className="mt-2 text-red-100/80">{frameTimeline.error}</p><Button type="button" variant="outline" size="sm" onClick={onBack} className="mt-4">返回准备</Button></div></main>
  if (session.state === "loading") return <main className="flex flex-1 items-center justify-center bg-bg-deep text-sm text-text-muted">正在恢复校准草稿…</main>
  if (session.state === "idle") return <main className="flex flex-1 items-center justify-center bg-bg-deep p-6"><div className="max-w-md rounded-xl border border-border bg-bg-panel p-5 text-center"><h1 className="text-lg font-semibold">复核候选镜头</h1><p className="mt-2 text-sm leading-6 text-text-muted">请先在准备阶段导入视频并完成一次自动分镜，校准工作区会在此恢复真实草稿。</p><Button type="button" variant="outline" size="sm" onClick={onBack} className="mt-4">返回准备</Button></div></main>
  if (session.state === "error" || !draft || draft.status === "conflict") return <main className="flex flex-1 items-center justify-center bg-bg-deep p-6"><div className="max-w-md rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100"><p className="font-medium">校准草稿需要重新确认</p><p className="mt-2 text-red-100/80">{session.error ?? "项目正式内容已在其他位置更新，当前草稿已保留但不能覆盖新版本。请返回并重新开始校准。"}</p><Button type="button" variant="outline" size="sm" onClick={onBack} className="mt-4">返回准备</Button></div></main>

  return <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg-deep text-text-base lg:overflow-hidden">
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-bg-nav px-4 py-2.5">
      <div className="min-w-0 flex-1"><h1 className="text-sm font-semibold">镜头校准</h1><p className="mt-0.5 text-[11px] text-text-muted">连续巡视，发现变化后暂停、逐帧定位并补切。</p></div>
      <div className="hidden items-center gap-3 text-[11px] text-text-muted md:flex"><span>已巡视 <b className="font-mono text-text">{formatTime(playedFrames, frameRate)}</b></span><span>·</span><span>已复核 <b className="font-mono text-text">{formatTime(reviewedFrames, frameRate)}</b></span><span>·</span><span>待回看 <b className="font-mono text-amber-200">{pendingIssues.length}</b></span></div>
      <span className={`rounded-full border px-2 py-1 text-[10px] ${session.saveState === "error" ? "border-red-400/30 text-red-200" : session.saveState === "saving" || session.saveState === "idle" ? "border-amber-400/30 text-amber-200" : "border-emerald-400/30 text-emerald-200"}`}>{session.saveState === "saving" ? "保存中" : session.saveState === "error" ? "未保存，可重试" : session.saveState === "saved" ? "草稿已保存" : "待保存"}</span>
      <Button type="button" variant="ghost" size="icon-sm" onClick={session.undo} disabled={!session.canUndo} aria-label="撤销"><Undo2 /></Button>
      <Button type="button" variant="ghost" size="icon-sm" onClick={session.redo} disabled={!session.canRedo} aria-label="重做"><Redo2 /></Button>
      <Button type="button" variant="outline" size="sm" onClick={onBack}>返回准备</Button>
      <Button type="button" size="sm" onClick={() => setIsApplyOpen(true)} className="gap-1.5 bg-accent text-white hover:bg-accent/90"><Check className="size-3.5" />完成并应用</Button>
    </header>
    <div className="grid h-max min-h-0 flex-none grid-cols-1 content-start overflow-visible lg:h-auto lg:flex-1 lg:grid-cols-[15rem_minmax(0,1fr)_17rem] lg:content-stretch lg:overflow-hidden">
      <aside className="order-2 flex min-h-48 flex-col border-t border-border bg-bg-panel lg:order-1 lg:min-h-0 lg:border-r lg:border-t-0">
        <div className="flex border-b border-border"><Button type="button" variant="ghost" size="sm" onClick={() => setNavigation("shots")} className={`flex-1 rounded-none ${navigation === "shots" ? "bg-accent/10 text-accent" : "text-text-muted"}`}>镜头 {draft.segments.length}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setNavigation("issues")} className={`flex-1 rounded-none ${navigation === "issues" ? "bg-accent/10 text-accent" : "text-text-muted"}`}>待回看 {pendingIssues.length}</Button></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {navigation === "shots" ? draft.segments.map((segment, index) => <button key={segment.id} type="button" onClick={() => selectSegment(segment)} aria-current={selectedSegmentId === segment.id ? "true" : undefined} aria-label={`定位镜头 ${index + 1} 的边界`} className={`mb-1 flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left ${selectedSegmentId === segment.id ? "border-accent/50 bg-accent/10" : "border-transparent hover:border-border hover:bg-bg-input/40"}`}><span className="min-w-0"><span className="block text-xs font-medium">镜头 {String(index + 1).padStart(2, "0")}</span><span className="mt-0.5 block font-mono text-[10px] text-text-muted">{formatTime(segment.startFrame, frameRate)} – {formatTime(segment.endFrame, frameRate)}</span></span><ChevronRight className="size-3 text-text-muted" /></button>) : draft.issues.map((issue) => <button key={issue.id} type="button" onClick={() => moveToFrame(issue.frame)} className="mb-1 w-full rounded-lg border border-border/70 px-2.5 py-2 text-left hover:bg-bg-input/40"><div className="flex items-center justify-between gap-2"><span className="font-mono text-[11px]">{formatTime(issue.frame, frameRate)}</span><span className={`text-[10px] ${issue.status === "pending" ? "text-amber-200" : "text-emerald-200"}`}>{issue.status === "pending" ? "待处理" : "已处理"}</span></div>{issue.note && <p className="mt-1 truncate text-[10px] text-text-muted">{issue.note}</p>}</button>)}
          {navigation === "issues" && draft.issues.length === 0 && <p className="p-3 text-xs leading-5 text-text-muted">还没有待回看项。巡视时发现不确定位置，可在右侧标记。</p>}
        </div>
      </aside>
      <section className="order-1 flex h-max min-w-0 flex-col overflow-visible lg:order-2 lg:h-auto lg:min-h-0 lg:overflow-hidden">
        <div className="h-[clamp(12rem,52vw,28rem)] min-h-48 shrink-0 p-3 lg:h-auto lg:min-h-0 lg:flex-1 lg:shrink"><VideoPreviewCanvas {...previewProps} /></div>
        <div className="shrink-0 border-t border-border bg-bg-panel px-3 py-2"><VideoPlaybackControls {...controlsProps} /></div>
        <div className="shrink-0 border-t border-border bg-bg-panel p-3"><CalibrationTimeline segments={draft.segments} boundaries={draft.boundaries} frameRate={frameRate} totalFrames={verifiedTotalFrames} currentFrame={frameTimeline.timeline ? timestampToFrame(frameTimeline.timeline, controlsProps.currentTime) : 0} selectedSegment={selectedSegment} selectedSegmentIndex={selectedSegmentIndex} onSelectSegment={selectSegment} onSeekFrame={seekToFrame} /></div>
      </section>
      <aside className="order-3 min-h-64 overflow-y-auto border-t border-border bg-bg-panel p-3 lg:min-h-0 lg:border-l lg:border-t-0">
        <div className="flex items-start justify-between gap-2"><div><h2 className="text-xs font-medium">当前帧操作</h2><p className="mt-1 text-[10px] leading-4 text-text-muted">精确帧确认后再写入草稿。</p></div><span className="rounded bg-accent/10 px-1.5 py-1 font-mono text-[10px] text-accent">F {frameTimeline.timeline ? timestampToFrame(frameTimeline.timeline, controlsProps.currentTime) : "—"}</span></div>
        <div className="mt-3 grid gap-2"><Button type="button" onClick={splitAtPlayhead} disabled={controlsProps.isUnavailable} className="h-9 justify-start gap-2 bg-accent text-white hover:bg-accent/90"><Scissors className="size-4" />在当前帧切开 <kbd className="ml-auto text-[10px] opacity-70">Enter</kbd></Button><Button type="button" variant="outline" onClick={addIssue} disabled={controlsProps.isUnavailable} className="h-9 justify-start gap-2"><Flag className="size-4" />标记待回看 <kbd className="ml-auto text-[10px] opacity-70">M</kbd></Button></div>
        <Input value={issueNote} onChange={(event) => setIssueNote(event.target.value)} placeholder="备注（可选）" className="mt-2 h-8 text-xs" />
        <div className="mt-5 border-t border-border pt-3"><div className="flex items-start justify-between gap-2"><div><h2 className="text-xs font-medium">边界检查</h2><p className="mt-1 text-[10px] leading-4 text-text-muted">点击左侧镜头，自动定位它对应的边界。</p></div>{selectedSegment && <span className="shrink-0 font-mono text-[10px] text-accent">镜头 {String(selectedSegmentIndex + 1).padStart(2, "0")}</span>}</div>{selectedBoundary ? <div className="mt-3 space-y-2"><p className="font-mono text-[11px] text-text-muted">{selectedBoundaryRole} · {formatTime(selectedBoundary.frame, frameRate)} · 第 {selectedBoundary.frame} 帧</p><BoundaryFramePair projectId={projectId} sourceUrl={videoUrl ?? ""} mediaFingerprint={mediaSource} timebase={frameTimeline.timeline} boundaryFrame={selectedBoundary.frame} /><div className="grid grid-cols-2 gap-1.5"><Button type="button" variant="outline" size="sm" onClick={() => dispatch({ type: "moveBoundary", boundaryId: selectedBoundary.id, frame: selectedBoundary.frame - 1 })}>前移一帧</Button><Button type="button" variant="outline" size="sm" onClick={() => dispatch({ type: "moveBoundary", boundaryId: selectedBoundary.id, frame: selectedBoundary.frame + 1 })}>后移一帧</Button><Button type="button" variant="outline" size="sm" onClick={() => dispatch({ type: "moveBoundary", boundaryId: selectedBoundary.id, frame: frameTimeline.timeline ? timestampToFrame(frameTimeline.timeline, controlsProps.currentTime) : selectedBoundary.frame })}>移动到当前帧</Button><Button type="button" variant="destructive" size="sm" onClick={() => { dispatch({ type: "removeBoundary", boundaryId: selectedBoundary.id }); setSelectedBoundaryId(null); setSelectedSegmentId(null) }}><Trash2 className="size-3" />合并前后镜头</Button></div></div> : <p className="mt-3 text-[10px] leading-4 text-text-muted">{selectedSegment ? "这个分镜没有可检查的内部边界。" : "选择左侧镜头后，这里会显示对应的边界双帧证据。"}</p>}</div>
        <div className="mt-5 border-t border-border pt-3"><Button type="button" variant="ghost" size="sm" className="w-full justify-start gap-2 text-text-muted" onClick={() => { if (pendingIssues[0]) { dispatch({ type: "resolveIssue", issueId: pendingIssues[0].id }); moveToFrame(pendingIssues[0].frame) } }} disabled={!pendingIssues.length}><Check className="size-3.5" />标记当前待回看为已处理</Button><Button type="button" variant="ghost" size="sm" className="mt-1 w-full justify-start gap-2 text-text-muted" onClick={() => { if (!frameTimeline.timeline) return; const frame = timestampToFrame(frameTimeline.timeline, controlsProps.currentTime); dispatch({ type: "addReviewRange", startFrame: Math.max(0, frame - Math.round(frameRate)), endFrame: Math.min(verifiedTotalFrames, frame + Math.round(frameRate)), kind: "explicit" }) }}><GitBranch className="size-3.5" />确认当前片段已检查</Button></div>
      </aside>
    </div>
    <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>应用校准草稿</DialogTitle><DialogDescription>正式镜头会在保存快照和校验版本后更新，原始自动检测记录保持不变。</DialogDescription></DialogHeader>{applySummary && <div className="space-y-2 rounded-lg border border-border bg-bg-input/20 p-3 text-sm"><p>最终镜头数：<b>{applySummary.total}</b></p><p className="text-text-muted">新增 {applySummary.added} · 合并 {applySummary.removed}</p>{pendingIssues.length > 0 && <p className="text-amber-200">仍有 {pendingIssues.length} 项待回看，可部分复核并应用。</p>}</div>}<DialogFooter><Button type="button" variant="outline" onClick={() => setIsApplyOpen(false)}>继续校准</Button><Button type="button" onClick={() => void apply()} disabled={isApplying}>{isApplying ? "应用中…" : "确认应用"}</Button></DialogFooter></DialogContent></Dialog>
  </main>
}
