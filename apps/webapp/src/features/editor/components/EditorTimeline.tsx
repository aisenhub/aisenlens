import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import type { AnnotationMarker } from "../../annotation/types"
import MarkerTimelineTrack from "../../annotation/components/MarkerTimelineTrack"
import type { ShotGroupKind, ShotGroupRecord } from "../../group/types"
import type { AudioTrack, MediaAsset, MediaSourceFingerprint } from "../../project/types"
import type { ShotData } from "../constants/editorData"
import AudioWaveform from "../../video/components/AudioWaveform"
import useTimelineTrackPreferences, { type TimelineTrackId } from "../../timeline/hooks/useTimelineTrackPreferences"
import useTimelineViewport from "../../timeline/hooks/useTimelineViewport"
import { timelineTrackDefinitionById, timelineTrackRegistry } from "../../timeline/trackRegistry"
import { resolveTimelineDetailLevel } from "../../timeline/timelineSemantics"
import type { TimelineNavigationFocus } from "../../timeline/timelineNavigation"
import { resolveNavigationBreadcrumb } from "../../timeline/timelineNavigation"
import TimelineRuler from "../../timeline/components/TimelineRuler"
import TimelineControls from "../../timeline/components/TimelineControls"
import TimelineTrackSettings from "../../timeline/components/TimelineTrackSettings"
import AudioTimelineTrack from "../../media/components/AudioTimelineTrack"
import StructureTimelineTrack from "../../timeline/components/StructureTimelineTrack"
import VisualTimelineTrack from "../../timeline/components/VisualTimelineTrack"

interface Props {
  shots: ShotData[]
  groups: ShotGroupRecord[]
  activeShotIndex: number
  selectedGroupId: string | null
  selectedMarkerId: string | null
  currentTime: number
  isPlaying: boolean
  durationSeconds: number
  frameRate: number
  projectId: string
  sourceUrl: string
  mediaFingerprint: MediaSourceFingerprint | null
  onActiveShotChange: (index: number) => void
  onCurrentTimeChange: (time: number) => void
  onPreviewTimeChange?: (time: number) => void
  onSelectGroup: (id: string, firstIndex: number) => void
  onSelectMarker: (marker: AnnotationMarker) => void
  markers: AnnotationMarker[]
  waveformPeaks: number[] | null
  waveformUnavailable: boolean
  matchingShotIds: Set<string>
  isFilteringShots: boolean
  completionByShotId: Record<string, { missingRequired: number }>
  onActivate: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  zoomRequest: { id: number; direction: -1 | 1 }
  viewRange: { inFrame: number | null; outFrame: number | null }
  audioTracks: AudioTrack[]
  mediaAssets: MediaAsset[]
  onAudioTracksChange: (audioTracks: AudioTrack[]) => void
  onCreateStructureAtBoundary?: (kind: ShotGroupKind, afterShotId: string) => void
  onMoveStructureBoundary?: (kind: ShotGroupKind, leftGroupId: string, rightGroupId: string, afterShotId: string) => void
  onResizeStructureEdge?: (kind: ShotGroupKind, groupId: string, edge: "start" | "end", targetShotId: string) => void
  onDoubleClickStructure?: (group: ShotGroupRecord, start: number, end: number) => void
  onDrillDownStructure?: (group: ShotGroupRecord) => { focus: TimelineNavigationFocus; start: number; end: number } | null
  navigationFocus?: TimelineNavigationFocus
  onNavigateFocus?: (focus: TimelineNavigationFocus) => void
}

export default function EditorTimeline(props: Props) {
  const { shots, groups, activeShotIndex, selectedGroupId, selectedMarkerId, currentTime, isPlaying, durationSeconds, frameRate, projectId, sourceUrl, mediaFingerprint, onActiveShotChange, onCurrentTimeChange, onPreviewTimeChange, onActivate, canUndo, canRedo, onUndo, onRedo, zoomRequest, viewRange, audioTracks, mediaAssets, onAudioTracksChange, onSelectGroup, onSelectMarker, markers, waveformPeaks, waveformUnavailable, matchingShotIds, isFilteringShots, completionByShotId, onCreateStructureAtBoundary, onMoveStructureBoundary, onResizeStructureEdge, onDoubleClickStructure, onDrillDownStructure, navigationFocus = { kind: "film" }, onNavigateFocus } = props
  const scrollRef = useRef<HTMLDivElement>(null)
  const trackHeaderScrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<{ x: number; left: number } | null>(null)
  const pendingScrubTimeRef = useRef<number | null>(null)
  const scrubAnimationFrameRef = useRef<number | null>(null)
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false)
  const [scrubTime, setScrubTime] = useState<number | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const safeDuration = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 1
  const viewport = useTimelineViewport({ durationSeconds: safeDuration, frameRate, scrollRef })
  const prefs = useTimelineTrackPreferences()
  const detail = resolveTimelineDetailLevel(viewport.pixelsPerSecond)
  const displayedTime = scrubTime ?? currentTime
  const playheadLeft = viewport.timeToPx(Math.max(0, Math.min(displayedTime, safeDuration)))
  const zoomTimeline = useCallback((direction: -1 | 1) => {
    const timeline = scrollRef.current
    const playheadOffset = timeline ? Math.max(0, Math.min(timeline.clientWidth, playheadLeft - timeline.scrollLeft)) : 0
    viewport.zoomAt(currentTime, viewport.zoom + direction * 0.5, playheadOffset)
  }, [currentTime, playheadLeft, viewport.zoom, viewport.zoomAt])
  const fitTimelineToFilm = useCallback(() => viewport.fitRange(0, safeDuration), [safeDuration, viewport.fitRange])
  const heightOf = (id: TimelineTrackId) => prefs.preferences[id].visible ? prefs.preferences[id].height : 20
  const seek = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const element = contentRef.current
    if (!element) return
    onCurrentTimeChange(Math.max(0, Math.min(safeDuration, viewport.pxToTime(event.clientX - element.getBoundingClientRect().left))))
  }, [onCurrentTimeChange, safeDuration, viewport.pxToTime])
  const timeFromPointer = useCallback((clientX: number) => {
    const element = contentRef.current
    if (!element) return null
    const time = Math.max(0, Math.min(safeDuration, viewport.pxToTime(clientX - element.getBoundingClientRect().left)))
    return Math.max(0, Math.min(safeDuration, Math.round(time * frameRate) / Math.max(1, frameRate)))
  }, [frameRate, safeDuration, viewport.pxToTime])
  const previewScrub = useCallback((time: number | null) => {
    if (time === null) return
    setScrubTime(time)
    pendingScrubTimeRef.current = time
    if (scrubAnimationFrameRef.current !== null) return
    scrubAnimationFrameRef.current = requestAnimationFrame(() => {
      scrubAnimationFrameRef.current = null
      const nextTime = pendingScrubTimeRef.current
      pendingScrubTimeRef.current = null
      if (nextTime !== null) (onPreviewTimeChange ?? onCurrentTimeChange)(nextTime)
    })
  }, [onCurrentTimeChange, onPreviewTimeChange])
  const startPlayheadDrag = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingPlayhead(true)
    previewScrub(timeFromPointer(event.clientX))
  }, [previewScrub, timeFromPointer])

  useEffect(() => {
    if (!isDraggingPlayhead) return
    const move = (event: MouseEvent) => previewScrub(timeFromPointer(event.clientX))
    const up = () => {
      if (scrubAnimationFrameRef.current !== null) cancelAnimationFrame(scrubAnimationFrameRef.current)
      scrubAnimationFrameRef.current = null
      setScrubTime((time) => { if (time !== null) onCurrentTimeChange(time); return null })
      pendingScrubTimeRef.current = null
      setIsDraggingPlayhead(false)
    }
    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", up, { once: true })
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up) }
  }, [isDraggingPlayhead, onCurrentTimeChange, previewScrub, timeFromPointer])
  useEffect(() => () => { if (scrubAnimationFrameRef.current !== null) cancelAnimationFrame(scrubAnimationFrameRef.current) }, [])
  useEffect(() => {
    const timeline = scrollRef.current
    if (!timeline) return
  const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const playheadOffset = Math.max(0, Math.min(timeline.clientWidth, playheadLeft - timeline.scrollLeft))
      viewport.zoomAt(currentTime, (value) => value + (event.deltaY < 0 ? 0.5 : -0.5), playheadOffset)
    }
    timeline.addEventListener("wheel", wheel, { passive: false })
    return () => timeline.removeEventListener("wheel", wheel)
  }, [currentTime, playheadLeft, viewport.zoomAt])
  useEffect(() => {
    if (zoomRequest.id === 0) return
    const timeline = scrollRef.current
    const playheadOffset = timeline ? Math.max(0, Math.min(timeline.clientWidth, playheadLeft - timeline.scrollLeft)) : 0
    viewport.zoomAt(currentTime, (value) => value + zoomRequest.direction * 0.5, playheadOffset)
  }, [currentTime, playheadLeft, viewport.zoomAt, zoomRequest])
  useEffect(() => {
    const timeline = scrollRef.current
    if (!timeline) return
    const down = (event: MouseEvent) => { if (event.button === 1) { event.preventDefault(); panRef.current = { x: event.clientX, left: timeline.scrollLeft }; setIsPanning(true) } }
    const move = (event: MouseEvent) => { if (panRef.current) timeline.scrollLeft = Math.max(0, panRef.current.left - event.clientX + panRef.current.x) }
    const up = () => { panRef.current = null; setIsPanning(false) }
    timeline.addEventListener("mousedown", down); window.addEventListener("mousemove", move); window.addEventListener("mouseup", up)
    return () => { timeline.removeEventListener("mousedown", down); window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up) }
  }, [])
  useEffect(() => {
    const timeline = scrollRef.current
    const headers = trackHeaderScrollRef.current
    if (!timeline || !headers) return
    let syncing = false
    const sync = (source: HTMLDivElement, target: HTMLDivElement) => { if (syncing || target.scrollTop === source.scrollTop) return; syncing = true; target.scrollTop = source.scrollTop; syncing = false }
    const syncHeaders = () => sync(timeline, headers)
    const syncTimeline = () => sync(headers, timeline)
    timeline.addEventListener("scroll", syncHeaders, { passive: true }); headers.addEventListener("scroll", syncTimeline, { passive: true }); syncHeaders()
    return () => { timeline.removeEventListener("scroll", syncHeaders); headers.removeEventListener("scroll", syncTimeline) }
  }, [])
  useEffect(() => {
    const timeline = scrollRef.current
    if (!timeline || !isPlaying || isPanning) return
    const playhead = viewport.timeToPx(currentTime)
    if (playhead < timeline.scrollLeft || playhead > timeline.scrollLeft + timeline.clientWidth * 0.8) timeline.scrollTo({ left: Math.max(0, playhead - timeline.clientWidth * 0.35) })
  }, [currentTime, isPanning, isPlaying, viewport.timeToPx])

  const moveTrackByStep = (trackId: TimelineTrackId, direction: -1 | 1) => {
    const index = prefs.order.indexOf(trackId)
    if (index < 0) return
    const next = [...prefs.order]
    ;[next[index], next[index + direction]] = [next[index + direction]!, next[index]!]
    prefs.setOrder(next)
  }
  const labels = useMemo(() => Object.fromEntries(timelineTrackRegistry.map((track) => [track.id, track.label])) as Record<TimelineTrackId, string>, [])
  const navigateToStructure = (group: ShotGroupRecord, start: number, end: number) => {
    viewport.fitRange(start, end)
    onDoubleClickStructure?.(group, start, end)
  }
  const drillDownStructure = (group: ShotGroupRecord) => {
    const target = onDrillDownStructure?.(group)
    if (target) {
      viewport.fitRange(target.start, target.end)
      onNavigateFocus?.(target.focus)
    }
  }
  const structureTrack = (kind: ShotGroupKind) => <StructureTimelineTrack projectId={projectId} kind={kind} groups={groups} shots={shots} selectedGroupId={selectedGroupId} visibleStart={viewport.visibleRange.start} visibleEnd={viewport.visibleRange.end} playheadLeft={playheadLeft} detail={detail} onSeek={seek} onSelectGroup={onSelectGroup} onDoubleClickGroup={navigateToStructure} onDrillDownGroup={drillDownStructure} onCreateAtBoundary={onCreateStructureAtBoundary} onMoveBoundary={onMoveStructureBoundary} onResizeEdge={onResizeStructureEdge} timeToPx={viewport.timeToPx} pxToTime={viewport.pxToTime} />
  const trackNodes: Record<TimelineTrackId, React.ReactNode> = {
    section: structureTrack("section"),
    sequence: structureTrack("sequence"),
    scene: structureTrack("scene"),
    visual: <VisualTimelineTrack shots={shots} activeShotIndex={activeShotIndex} currentTime={currentTime} frameRate={frameRate} durationSeconds={safeDuration} projectId={projectId} sourceUrl={sourceUrl} mediaFingerprint={mediaFingerprint} pixelsPerSecond={viewport.pixelsPerSecond} visibleStart={viewport.visibleRange.start} visibleEnd={viewport.visibleRange.end} playheadLeft={playheadLeft} detail={detail} matchingShotIds={matchingShotIds} isFilteringShots={isFilteringShots} completionByShotId={completionByShotId} onActiveShotChange={onActiveShotChange} onCurrentTimeChange={onCurrentTimeChange} onSeek={seek} timeToPx={viewport.timeToPx} />,
    markers: <MarkerTimelineTrack markers={markers} selectedMarkerId={selectedMarkerId} frameRate={frameRate} visibleStart={viewport.visibleRange.start} visibleEnd={viewport.visibleRange.end} pixelsPerSecond={viewport.pixelsPerSecond} playheadLeft={playheadLeft} detail={detail} onSeek={seek} onSelectMarker={(marker) => { onSelectMarker(marker); onCurrentTimeChange(marker.frame / Math.max(1, frameRate)) }} timeToPx={viewport.timeToPx} />,
    "primary-audio": <TimelineTrackAudio waveformPeaks={waveformPeaks} currentTime={currentTime} safeDuration={safeDuration} waveformUnavailable={waveformUnavailable} height={heightOf("primary-audio")} seek={seek} playheadLeft={playheadLeft} />,
  }
  const audioTimelineHeight = audioTracks.length * 44
  const timelineHeight = 24 + prefs.order.reduce((total, id) => total + heightOf(id), 0) + audioTimelineHeight
  const breadcrumb = useMemo(() => resolveNavigationBreadcrumb({ focus: navigationFocus, groups, shots, durationSeconds: safeDuration }), [durationSeconds, groups, navigationFocus, safeDuration, shots])
  const timelineToolbarHeight = 36
  return <div className="flex min-h-0 shrink-0 flex-col border-t border-border bg-bg-panel" style={{ height: timelineHeight + timelineToolbarHeight }}>
    <TimelineControls canUndo={canUndo} canRedo={canRedo} zoom={viewport.zoom} canZoomOut={viewport.zoom > 1.001} canZoomIn={viewport.zoom < viewport.maxZoom - 0.001} onUndo={onUndo} onRedo={onRedo} onZoomOut={() => zoomTimeline(-1)} onZoomIn={() => zoomTimeline(1)} onFitToFilm={fitTimelineToFilm} />
    <div className="flex min-h-0 flex-1">
      <div ref={trackHeaderScrollRef} className="z-40 flex w-24 shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-border bg-bg-panel">
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-2 font-mono text-[10px] text-text-muted" style={{ height: 24 }}><span>时间</span><TimelineTrackSettings order={prefs.order} labels={labels} preferences={prefs.preferences} onVisibleChange={prefs.setVisible} onHeightChange={prefs.setHeight} onMove={moveTrackByStep} canMove={(trackId) => trackId === "markers"} /></div>
        {prefs.order.map((id) => <div key={id} style={{ height: heightOf(id) }}><TimelineTrackHeaderLite label={timelineTrackDefinitionById[id].label} visible={prefs.preferences[id].visible} height={heightOf(id)} onHeightChange={(height) => prefs.setHeight(id, height)} /></div>)}
        {audioTracks.map((track) => <div key={track.id} className="flex h-11 shrink-0 items-center gap-1.5 border-b border-border/60 px-2"><span className={`size-1.5 shrink-0 rounded-full ${track.muted ? "bg-text-muted" : "bg-cyan-300"}`} /><span className="truncate font-mono text-[10px] text-text-dim">{track.name}</span></div>)}
      </div>
      <div ref={scrollRef} tabIndex={0} aria-label="项目时间轴" onPointerDownCapture={onActivate} className={`min-w-0 flex-1 overflow-auto outline-none ${isPanning ? "cursor-grabbing" : ""}`}>
        <div ref={contentRef} className="relative min-h-full" style={{ width: viewport.contentWidth }}>
          <div className="flex h-6 items-center gap-1 border-b border-border/50 bg-bg-panel/80 px-2 font-mono text-[9px] text-text-muted" aria-label="时间轴观察路径">{breadcrumb.map((item, index) => <span key={`${item.kind}-${item.id ?? "film"}`} className="flex items-center gap-1"><button type="button" onClick={() => { onNavigateFocus?.({ kind: item.kind, ...(item.id ? { id: item.id } : {}) } as TimelineNavigationFocus); viewport.fitRange(item.start, item.end) }} className={`max-w-36 truncate hover:text-accent ${index === breadcrumb.length - 1 ? "text-text-dim" : ""}`}>{item.label}</button>{index < breadcrumb.length - 1 && <span aria-hidden="true">›</span>}</span>)}</div>
          <TimelineRuler contentWidth={viewport.contentWidth} pixelsPerSecond={viewport.pixelsPerSecond} visibleStart={viewport.visibleRange.start} visibleEnd={viewport.visibleRange.end} playheadLeft={playheadLeft} onSeek={seek} isDraggingPlayhead={isDraggingPlayhead} onPlayheadMouseDown={startPlayheadDrag} frameRate={frameRate} viewRange={viewRange} />
          {prefs.order.map((id) => <div key={id} style={{ height: heightOf(id) }}>{trackNodes[id]}</div>)}
          {audioTracks.map((track) => <AudioTimelineTrack key={track.id} track={track} mediaAssets={mediaAssets} frameRate={frameRate} contentWidth={viewport.contentWidth} pixelsPerSecond={viewport.pixelsPerSecond} playheadLeft={playheadLeft} onSeek={seek} onTrackChange={(nextTrack) => onAudioTracksChange(audioTracks.map((item) => item.id === nextTrack.id ? nextTrack : item))} />)}
        </div>
      </div>
    </div>
  </div>
}

function TimelineTrackAudio({ waveformPeaks, currentTime, safeDuration, waveformUnavailable, height, seek, playheadLeft }: { waveformPeaks: number[] | null; currentTime: number; safeDuration: number; waveformUnavailable: boolean; height: number; seek: (event: ReactMouseEvent<HTMLDivElement>) => void; playheadLeft: number }) {
  return <div className="relative h-full cursor-pointer border-b border-border/60" style={{ height }} onClick={seek}><AudioWaveform peaks={waveformPeaks} currentTime={currentTime} durationSeconds={safeDuration} unavailable={waveformUnavailable} /><div className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-accent/70" style={{ left: playheadLeft }} /></div>
}

function TimelineTrackHeaderLite({ label, visible, height, onHeightChange }: { label: string; visible: boolean; height: number; onHeightChange: (height: number) => void }) {
  const [isResizing, setIsResizing] = useState(false)
  const startRef = useRef<{ clientY: number; height: number } | null>(null)
  useEffect(() => {
    if (!isResizing) return
    const handleMove = (event: MouseEvent) => { const start = startRef.current; if (start) onHeightChange(start.height + event.clientY - start.clientY) }
    const finish = () => { startRef.current = null; setIsResizing(false) }
    window.addEventListener("mousemove", handleMove); window.addEventListener("mouseup", finish)
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", finish) }
  }, [isResizing, onHeightChange])
  return <div className="relative flex h-full shrink-0 items-center border-b border-border bg-bg-panel px-1"><span className={`min-w-0 flex-1 truncate px-1 font-mono editor-micro ${visible ? "text-text-muted" : "text-text-muted/55"}`}>{label}</span><span role="separator" aria-label={`调整${label}轨道高度`} onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); startRef.current = { clientY: event.clientY, height }; setIsResizing(true) }} className="absolute inset-x-0 -bottom-1 z-30 h-2 cursor-row-resize" /></div>
}
