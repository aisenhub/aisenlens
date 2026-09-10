import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import type {
  AnnotationMarker,
  AnnotationMarkerCategory,
} from "../../annotation/types"
import type { ShotGroupRecord } from "../../group/types"
import type {
  AudioTrack,
  MediaAsset,
  MediaSourceFingerprint,
} from "../../project/types"
import type { ShotData } from "../constants/editorData"
import AudioWaveform from "../../video/components/AudioWaveform"
import FrameThumbnailStrip from "../../video/components/FrameThumbnailStrip"
import useTimelineTrackPreferences, {
  type TimelineTrackId,
} from "../../timeline/hooks/useTimelineTrackPreferences"
import useTimelineViewport from "../../timeline/hooks/useTimelineViewport"
import TimelineRuler from "../../timeline/components/TimelineRuler"
import TimelineTrack from "../../timeline/components/TimelineTrack"
import TimelineTrackHeader from "../../timeline/components/TimelineTrackHeader"
import TimelineTrackSettings from "../../timeline/components/TimelineTrackSettings"
import AudioTimelineTrack from "../../media/components/AudioTimelineTrack"

interface Props {
  shots: ShotData[]
  groups: ShotGroupRecord[]
  activeShotIndex: number
  selectedGroupId: string | null
  selectedMarkerId: string | null
  visibleMarkerCategories: AnnotationMarkerCategory[]
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
  onToggleMarkerCategory: (category: AnnotationMarkerCategory) => void
  markers: AnnotationMarker[]
  waveformPeaks: number[] | null
  waveformUnavailable: boolean
  matchingShotIds: Set<string>
  isFilteringShots: boolean
  completionByShotId: Record<string, {
    filled: number
    total: number
    missingRequired: number
  }>
  onActivate: () => void
  zoomRequest: { id: number; direction: -1 | 1 }
  viewRange: { inFrame: number | null; outFrame: number | null }
  audioTracks: AudioTrack[]
  mediaAssets: MediaAsset[]
  onAudioTracksChange: (audioTracks: AudioTrack[]) => void
}

const markerColors: Record<AnnotationMarkerCategory, string> = {
  important: "#fbbf24",
  composition: "#38bdf8",
  emotion: "#a78bfa",
  "turning-point": "#fb7185",
}
const labels: Record<TimelineTrackId, string> = {
  "primary-audio": "音频",
  "video-frames": "帧带",
  groups: "分组",
  shots: "分镜",
}

export default function EditorTimeline(props: Props) {
  const {
    shots,
    groups,
    activeShotIndex,
    selectedGroupId,
    selectedMarkerId,
    visibleMarkerCategories,
    currentTime,
    isPlaying,
    durationSeconds,
    frameRate,
    projectId,
    sourceUrl,
    mediaFingerprint,
    onActiveShotChange,
    onCurrentTimeChange,
    onPreviewTimeChange,
    onActivate,
    zoomRequest,
    viewRange,
    audioTracks,
    mediaAssets,
    onAudioTracksChange,
    onSelectGroup,
    onSelectMarker,
    onToggleMarkerCategory,
    markers,
    waveformPeaks,
    waveformUnavailable,
    matchingShotIds,
    isFilteringShots,
    completionByShotId,
  } = props
  const scrollRef = useRef<HTMLDivElement>(null)
  const trackHeaderScrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<{ x: number; left: number } | null>(null)
  const pendingScrubTimeRef = useRef<number | null>(null)
  const scrubAnimationFrameRef = useRef<number | null>(null)
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false)
  const [scrubTime, setScrubTime] = useState<number | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const safeDuration = Math.max(1, durationSeconds)
  const viewport = useTimelineViewport({
    durationSeconds: safeDuration,
    scrollRef,
  })
  const prefs = useTimelineTrackPreferences()
  const displayedTime = scrubTime ?? currentTime
  const playheadLeft = viewport.timeToPx(
    Math.max(0, Math.min(displayedTime, safeDuration)),
  )
  const heightOf = (id: TimelineTrackId) =>
    prefs.preferences[id].visible ? prefs.preferences[id].height : 20
  const seek = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const element = contentRef.current
      if (!element) return
      onCurrentTimeChange(
        Math.max(
          0,
          Math.min(
            safeDuration,
            viewport.pxToTime(
              event.clientX - element.getBoundingClientRect().left,
            ),
          ),
        ),
      )
    },
    [onCurrentTimeChange, safeDuration, viewport],
  )
  const timeFromPointer = useCallback(
    (clientX: number) => {
      const element = contentRef.current
      if (!element) return null
      const time = Math.max(
        0,
        Math.min(
          safeDuration,
          viewport.pxToTime(clientX - element.getBoundingClientRect().left),
        ),
      )
      return Math.max(
        0,
        Math.min(safeDuration, Math.round(time * frameRate) / frameRate),
      )
    },
    [frameRate, safeDuration, viewport],
  )
  const previewScrub = useCallback(
    (time: number | null) => {
      if (time === null) return
      setScrubTime(time)
      pendingScrubTimeRef.current = time
      if (scrubAnimationFrameRef.current !== null) return
      scrubAnimationFrameRef.current = requestAnimationFrame(() => {
        scrubAnimationFrameRef.current = null
        const nextTime = pendingScrubTimeRef.current
        pendingScrubTimeRef.current = null
        if (nextTime !== null)
          (onPreviewTimeChange ?? onCurrentTimeChange)(nextTime)
      })
    },
    [onCurrentTimeChange, onPreviewTimeChange],
  )

  const startPlayheadDrag = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDraggingPlayhead(true)
      previewScrub(timeFromPointer(event.clientX))
    },
    [previewScrub, timeFromPointer],
  )

  useEffect(() => {
    if (!isDraggingPlayhead) return
    const move = (event: MouseEvent) =>
      previewScrub(timeFromPointer(event.clientX))
    const up = () => {
      if (scrubAnimationFrameRef.current !== null) {
        cancelAnimationFrame(scrubAnimationFrameRef.current)
        scrubAnimationFrameRef.current = null
      }
      setScrubTime((time) => {
        if (time !== null) onCurrentTimeChange(time)
        return null
      })
      pendingScrubTimeRef.current = null
      setIsDraggingPlayhead(false)
    }
    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", up, { once: true })
    return () => {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mouseup", up)
    }
  }, [isDraggingPlayhead, onCurrentTimeChange, previewScrub])

  useEffect(
    () => () => {
      if (scrubAnimationFrameRef.current !== null)
        cancelAnimationFrame(scrubAnimationFrameRef.current)
    },
    [],
  )

  useEffect(() => {
    const timeline = scrollRef.current
    if (!timeline) return
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const playheadOffset = Math.max(
        0,
        Math.min(timeline.clientWidth, playheadLeft - timeline.scrollLeft),
      )
      viewport.zoomAt(
        currentTime,
        (value) => value + (event.deltaY < 0 ? 0.5 : -0.5),
        playheadOffset,
      )
    }
    timeline.addEventListener("wheel", wheel, { passive: false })
    return () => timeline.removeEventListener("wheel", wheel)
  }, [currentTime, playheadLeft, viewport])
  useEffect(() => {
    if (zoomRequest.id === 0) return
    const timeline = scrollRef.current
    const playheadOffset = timeline
      ? Math.max(
          0,
          Math.min(timeline.clientWidth, playheadLeft - timeline.scrollLeft),
        )
      : 0
    viewport.zoomAt(
      currentTime,
      (value) => value + zoomRequest.direction * 0.5,
      playheadOffset,
    )
  }, [currentTime, playheadLeft, viewport, zoomRequest])
  useEffect(() => {
    const timeline = scrollRef.current
    if (!timeline) return
    const down = (event: MouseEvent) => {
      if (event.button === 1) {
        event.preventDefault()
        panRef.current = { x: event.clientX, left: timeline.scrollLeft }
        setIsPanning(true)
      }
    }
    const move = (event: MouseEvent) => {
      if (panRef.current)
        timeline.scrollLeft = Math.max(
          0,
          panRef.current.left - event.clientX + panRef.current.x,
        )
    }
    const up = () => {
      panRef.current = null
      setIsPanning(false)
    }
    timeline.addEventListener("mousedown", down)
    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", up)
    return () => {
      timeline.removeEventListener("mousedown", down)
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mouseup", up)
    }
  }, [])
  useEffect(() => {
    const timeline = scrollRef.current
    const headers = trackHeaderScrollRef.current
    if (!timeline || !headers) return
    let syncing = false
    const sync = (source: HTMLDivElement, target: HTMLDivElement) => {
      if (syncing || target.scrollTop === source.scrollTop) return
      syncing = true
      target.scrollTop = source.scrollTop
      syncing = false
    }
    const syncHeaders = () => sync(timeline, headers)
    const syncTimeline = () => sync(headers, timeline)
    timeline.addEventListener("scroll", syncHeaders, { passive: true })
    headers.addEventListener("scroll", syncTimeline, { passive: true })
    syncHeaders()
    return () => {
      timeline.removeEventListener("scroll", syncHeaders)
      headers.removeEventListener("scroll", syncTimeline)
    }
  }, [])
  useEffect(() => {
    const timeline = scrollRef.current
    if (!timeline || !isPlaying || isPanning) return
    const playhead = viewport.timeToPx(currentTime)
    if (
      playhead < timeline.scrollLeft ||
      playhead > timeline.scrollLeft + timeline.clientWidth * 0.8
    )
      timeline.scrollTo({
        left: Math.max(0, playhead - timeline.clientWidth * 0.35),
      })
  }, [currentTime, isPanning, isPlaying, viewport])

  const groupRanges = useMemo(
    () =>
      groups.flatMap((group) => {
        const indexes = group.shotIds.map((id) =>
          shots.findIndex((shot) => shot.id === id),
        )
        if (!indexes.length || indexes.some((index) => index < 0)) return []
        const firstIndex = Math.min(...indexes)
        const first = shots[firstIndex]
        const last = shots[Math.max(...indexes)]
        const end = last.start + last.duration
        return [
          {
            ...group,
            firstIndex,
            start: first.start,
            end,
            duration: end - first.start,
          },
        ]
      }),
    [groups, shots],
  )
  const activeShotId = shots[activeShotIndex]?.id
  const moveTrackByStep = (trackId: TimelineTrackId, direction: -1 | 1) => {
    const index = prefs.order.indexOf(trackId)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= prefs.order.length)
      return
    const next = [...prefs.order]
    ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
    prefs.setOrder(next)
  }
  const trackNodes: Record<TimelineTrackId, React.ReactNode> = {
    "primary-audio": (
      <TimelineTrack
        className="cursor-pointer border-b border-border/60"
        style={{ height: heightOf("primary-audio") }}
        onSeek={seek}
        playheadLeft={playheadLeft}
      >
        {prefs.preferences["primary-audio"].visible && (
          <AudioWaveform
            peaks={waveformPeaks}
            currentTime={currentTime}
            durationSeconds={safeDuration}
            unavailable={waveformUnavailable}
          />
        )}
      </TimelineTrack>
    ),
    "video-frames": (
      <TimelineTrack
        className="cursor-pointer border-y border-black/60 bg-black"
        style={{ height: heightOf("video-frames") }}
        onSeek={seek}
        playheadLeft={playheadLeft}
      >
        {prefs.preferences["video-frames"].visible &&
          mediaFingerprint &&
          sourceUrl && (
            <FrameThumbnailStrip
              projectId={projectId}
              sourceUrl={sourceUrl}
              mediaFingerprint={mediaFingerprint}
              durationSeconds={safeDuration}
              frameRate={frameRate}
              pixelsPerSecond={viewport.pixelsPerSecond}
              visibleStart={viewport.visibleRange.start}
              visibleEnd={viewport.visibleRange.end}
              currentTime={currentTime}
              onSeek={onCurrentTimeChange}
            />
          )}
      </TimelineTrack>
    ),
    groups: (
      <TimelineTrack
        className="border-b border-border/60"
        style={{ height: heightOf("groups") }}
        onSeek={seek}
        playheadLeft={playheadLeft}
      >
        {prefs.preferences.groups.visible &&
          groupRanges.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onSelectGroup(group.id, group.firstIndex)
              }}
              className={`absolute top-1 rounded-sm border px-1 text-left ${
                selectedGroupId === group.id
                  ? "border-fuchsia-200 bg-fuchsia-400/35"
                  : "border-fuchsia-300/35 bg-fuchsia-400/15 hover:bg-fuchsia-400/25"
              }`}
              style={{
                left: viewport.timeToPx(group.start),
                width: Math.max(1, viewport.timeToPx(group.end - group.start)),
                height: "calc(100% - 8px)",
              }}
            >
              <span className="block truncate text-[8px] text-fuchsia-100">
                {group.title} #{String(group.firstIndex + 1).padStart(2, "0")}-
                {String(group.firstIndex + group.shotIds.length).padStart(
                  2,
                  "0",
                )}{" "}
                · {group.duration.toFixed(2)}s
              </span>
            </button>
          ))}
      </TimelineTrack>
    ),
    shots: (
      <TimelineTrack
        className="cursor-pointer border-b border-border/60"
        style={{ height: heightOf("shots") }}
        onSeek={seek}
        playheadLeft={playheadLeft}
      >
        {prefs.preferences.shots.visible &&
          shots.map((shot, index) => {
            const active = index === activeShotIndex
            const atPlayhead =
              currentTime >= shot.start &&
              currentTime < shot.start + shot.duration
            const matched = matchingShotIds.has(shot.id)
            const incomplete = completionByShotId[shot.id]?.missingRequired > 0
            return (
              <button
                key={shot.id}
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onActiveShotChange(index)
                  onCurrentTimeChange(shot.start)
                }}
                className={`absolute bottom-0 top-0 flex items-center justify-center overflow-visible border transition-colors ${
                  isFilteringShots && !matched
                    ? "border-transparent opacity-25"
                    : active
                      ? "z-10 border-accent bg-accent/20"
                      : matched && isFilteringShots
                        ? "border-accent/80 bg-accent/15"
                        : atPlayhead
                          ? "border-border-mid bg-white/10"
                          : "border-border/40 bg-white/[0.03] hover:bg-white/[0.07]"
                }`}
                style={{
                  left: viewport.timeToPx(shot.start),
                  width: Math.max(1, viewport.timeToPx(shot.duration)),
                }}
              >
                {(active ||
                  atPlayhead ||
                  (matched && isFilteringShots) ||
                  viewport.timeToPx(shot.duration) >= 34) && (
                  <span className="flex items-center gap-0.5 truncate px-0.5 font-mono text-[8px] text-text-dim">
                    {String(index + 1).padStart(2, "0")}
                    {incomplete && (
                      <i className="size-1 shrink-0 rounded-full bg-amber-400" />
                    )}
                  </span>
                )}
              </button>
            )
          })}
      </TimelineTrack>
    ),
  }
  const audioTimelineHeight = audioTracks.length * 44
  return (
    <div
      className="flex min-h-0 shrink-0 border-t border-border bg-bg-panel"
      style={{ height: 192 + audioTimelineHeight }}
    >
      <div
        ref={trackHeaderScrollRef}
        className="z-40 flex w-24 shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-border bg-bg-panel"
      >
        <div
          className="flex shrink-0 items-center justify-between border-b border-border/60 px-2 font-mono text-[10px] text-text-muted"
          style={{ height: 24 }}
        >
          <span>时间</span>
          <TimelineTrackSettings
            order={prefs.order}
            labels={labels}
            preferences={prefs.preferences}
            onVisibleChange={prefs.setVisible}
            onHeightChange={prefs.setHeight}
            onMove={moveTrackByStep}
          />
        </div>
        {prefs.order.map((id) => (
          <TimelineTrackHeader
            key={id}
            label={labels[id]}
            visible={prefs.preferences[id].visible}
            height={heightOf(id)}
            onHeightChange={(height) => prefs.setHeight(id, height)}
          />
        ))}
        {audioTracks.map((track) => (
          <div
            key={track.id}
            className="flex h-11 shrink-0 items-center gap-1.5 border-b border-border/60 px-2"
          >
            <span
              className={`size-1.5 shrink-0 rounded-full ${
                track.muted ? "bg-text-muted" : "bg-cyan-300"
              }`}
            />
            <span className="truncate font-mono text-[10px] text-text-dim">
              {track.name}
            </span>
          </div>
        ))}
      </div>
      <div
        ref={scrollRef}
        tabIndex={0}
        aria-label="项目时间轴"
        onPointerDownCapture={onActivate}
        className={`min-w-0 flex-1 overflow-auto outline-none ${
          isPanning ? "cursor-grabbing" : ""
        }`}
      >
        <div
          ref={contentRef}
          className="relative min-h-full"
          style={{ width: viewport.contentWidth }}
        >
          <TimelineRuler
            contentWidth={viewport.contentWidth}
            pixelsPerSecond={viewport.pixelsPerSecond}
            visibleStart={viewport.visibleRange.start}
            visibleEnd={viewport.visibleRange.end}
            playheadLeft={playheadLeft}
            onSeek={seek}
            isDraggingPlayhead={isDraggingPlayhead}
            onPlayheadMouseDown={startPlayheadDrag}
            markers={markers}
            markerColors={markerColors}
            visibleMarkerCategories={visibleMarkerCategories}
            selectedMarkerId={selectedMarkerId}
            activeShotId={activeShotId}
            frameRate={frameRate}
            viewRange={viewRange}
            onSelectMarker={(marker) => {
              onSelectMarker(marker)
              onCurrentTimeChange(marker.frame / frameRate)
            }}
          />
          {prefs.order.map((id) => (
            <div key={id}>{trackNodes[id]}</div>
          ))}
          {audioTracks.map((track) => (
            <AudioTimelineTrack
              key={track.id}
              track={track}
              mediaAssets={mediaAssets}
              frameRate={frameRate}
              contentWidth={viewport.contentWidth}
              pixelsPerSecond={viewport.pixelsPerSecond}
              playheadLeft={playheadLeft}
              onSeek={seek}
              onTrackChange={(nextTrack) =>
                onAudioTracksChange(
                  audioTracks.map((trackItem) =>
                    trackItem.id === nextTrack.id ? nextTrack : trackItem,
                  ),
                )
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}
