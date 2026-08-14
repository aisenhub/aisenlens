import { useEffect, useRef, useState } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import TimelineTrack from "../../timeline/components/TimelineTrack"
import type { AudioClip, AudioTrack, MediaAsset } from "../../project/types"
import { loadMediaAssetArrayBuffer } from "../services/mediaAssetResourceService"

type DragMode = "move" | "trim-start" | "trim-end" | "fade-in" | "fade-out"

interface ClipDragState {
  clipId: string
  mode: DragMode
  startClientX: number
  original: AudioClip
}

interface AudioTimelineTrackProps {
  track: AudioTrack
  mediaAssets: MediaAsset[]
  frameRate: number
  contentWidth: number
  pixelsPerSecond: number
  playheadLeft: number
  onSeek: (event: ReactMouseEvent<HTMLDivElement>) => void
  onTrackChange: (track: AudioTrack) => void
}

function clampFrame(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, Math.round(value)))
}

function createWaveformPeaks(buffer: AudioBuffer, count = 72): number[] {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index))
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor((index / count) * buffer.length)
    const end = Math.max(start + 1, Math.floor(((index + 1) / count) * buffer.length))
    let peak = 0
    for (let sample = start; sample < end; sample += 1) {
      for (const channel of channels) peak = Math.max(peak, Math.abs(channel[sample] ?? 0))
    }
    return peak
  })
}

export default function AudioTimelineTrack({
  track,
  mediaAssets,
  frameRate,
  contentWidth,
  pixelsPerSecond,
  playheadLeft,
  onSeek,
  onTrackChange,
}: AudioTimelineTrackProps) {
  const [draftTrack, setDraftTrack] = useState(track)
  const [peaksByAssetId, setPeaksByAssetId] = useState<Record<string, number[]>>({})
  const dragRef = useRef<ClipDragState | null>(null)

  useEffect(() => setDraftTrack(track), [track])
  useEffect(() => {
    const AudioContextConstructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextConstructor) return
    let cancelled = false
    const context = new AudioContextConstructor()
    const assets = mediaAssets.filter((asset) => draftTrack.clips.some((clip) => clip.assetId === asset.id) && !peaksByAssetId[asset.id])
    void Promise.all(assets.map(async (asset) => [asset.id, createWaveformPeaks(await context.decodeAudioData((await loadMediaAssetArrayBuffer(asset)).slice(0)))] as const)).then((items) => {
      if (!cancelled) setPeaksByAssetId((current) => ({ ...current, ...Object.fromEntries(items) }))
    }).catch(() => undefined).finally(() => void context.close())
    return () => { cancelled = true }
  }, [draftTrack.clips, mediaAssets, peaksByAssetId])

  const updateClip = (clipId: string, nextClip: AudioClip) => {
    setDraftTrack((current) => ({
      ...current,
      clips: current.clips.map((clip) =>
        clip.id === clipId ? nextClip : clip,
      ),
    }))
  }

  const startDrag = (
    event: ReactMouseEvent<HTMLElement>,
    clip: AudioClip,
    mode: DragMode,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = {
      clipId: clip.id,
      mode,
      startClientX: event.clientX,
      original: clip,
    }
    const move = (moveEvent: MouseEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const frameDelta = Math.round(
        ((moveEvent.clientX - drag.startClientX) / pixelsPerSecond) * frameRate,
      )
      const minimumDuration = 1
      if (drag.mode === "move") {
        updateClip(drag.clipId, {
          ...drag.original,
          startFrame: Math.max(0, drag.original.startFrame + frameDelta),
        })
        return
      }
      if (drag.mode === "trim-start") {
        const trimDelta = clampFrame(
          frameDelta,
          -drag.original.inFrame,
          drag.original.durationFrames - minimumDuration,
        )
        updateClip(drag.clipId, {
          ...drag.original,
          startFrame: Math.max(0, drag.original.startFrame + trimDelta),
          inFrame: drag.original.inFrame + trimDelta,
          durationFrames: drag.original.durationFrames - trimDelta,
        })
        return
      }
      if (drag.mode === "fade-in") {
        updateClip(drag.clipId, {
          ...drag.original,
          fadeInFrames: clampFrame(drag.original.fadeInFrames + frameDelta, 0, drag.original.durationFrames),
        })
        return
      }
      if (drag.mode === "fade-out") {
        updateClip(drag.clipId, {
          ...drag.original,
          fadeOutFrames: clampFrame(drag.original.fadeOutFrames - frameDelta, 0, drag.original.durationFrames),
        })
        return
      }
      updateClip(drag.clipId, {
        ...drag.original,
        durationFrames: Math.max(
          minimumDuration,
          drag.original.durationFrames + frameDelta,
        ),
      })
    }
    const finish = () => {
      dragRef.current = null
      setDraftTrack((current) => {
        onTrackChange(current)
        return current
      })
      window.removeEventListener("mousemove", move)
    }
    window.addEventListener("mousemove", move)
    window.addEventListener("mouseup", finish, { once: true })
  }

  return (
    <TimelineTrack
      className="cursor-pointer border-b border-border/60 bg-bg-deep/40"
      style={{ height: 44, width: contentWidth }}
      onSeek={onSeek}
      playheadLeft={playheadLeft}
    >
      {draftTrack.clips.map((clip) => {
        const asset = mediaAssets.find((item) => item.id === clip.assetId)
        const peaks = peaksByAssetId[clip.assetId] ?? []
        const left = (clip.startFrame / frameRate) * pixelsPerSecond
        const width = Math.max(
          16,
          (clip.durationFrames / frameRate) * pixelsPerSecond,
        )
        const fadeInWidth = `${Math.min(100, (clip.fadeInFrames / Math.max(1, clip.durationFrames)) * 100)}%`
        const fadeOutWidth = `${Math.min(100, (clip.fadeOutFrames / Math.max(1, clip.durationFrames)) * 100)}%`
        return (
          <button
            key={clip.id}
            type="button"
            onMouseDown={(event) => startDrag(event, clip, "move")}
            className={`absolute bottom-1 top-1 overflow-hidden rounded border text-left transition-colors ${
              draftTrack.muted || clip.muted
                ? "border-border-mid/60 bg-slate-500/20 text-text-muted"
                : "border-cyan-300/40 bg-cyan-400/15 text-cyan-50 hover:bg-cyan-400/25"
            }`}
            style={{ left, width }}
            title={`${asset?.name ?? "音频素材"} · 拖动移动；拖动两端裁剪`}
          >
            <span className="pointer-events-none absolute inset-x-1 top-1 flex h-[calc(100%-0.5rem)] items-center gap-px overflow-hidden opacity-60">
              {peaks.map((peak, index) => <i key={index} className="min-w-px flex-1 rounded-full bg-current" style={{ height: `${Math.max(10, peak * 100)}%` }} />)}
            </span>
            <span className="relative block truncate px-2 font-mono text-[9px] leading-8">
              {asset?.name ?? "缺失音频"}
            </span>
            <span className="pointer-events-none absolute bottom-0 left-0 top-0 border-r border-cyan-100/45 bg-cyan-100/10" style={{ width: fadeInWidth, clipPath: "polygon(0 0, 100% 100%, 0 100%)" }} />
            <span className="pointer-events-none absolute bottom-0 right-0 top-0 border-l border-cyan-100/45 bg-cyan-100/10" style={{ width: fadeOutWidth, clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }} />
            <i aria-label="调整淡入" title="拖动调整淡入" onMouseDown={(event) => startDrag(event, clip, "fade-in")} className="absolute bottom-0 z-10 size-2 -translate-x-1/2 cursor-ew-resize rounded-sm border border-cyan-100/70 bg-cyan-300" style={{ left: fadeInWidth }} />
            <i aria-label="调整淡出" title="拖动调整淡出" onMouseDown={(event) => startDrag(event, clip, "fade-out")} className="absolute right-0 top-0 z-10 size-2 translate-x-1/2 cursor-ew-resize rounded-sm border border-cyan-100/70 bg-cyan-300" style={{ right: fadeOutWidth }} />
            <i
              aria-label="裁剪开头"
              onMouseDown={(event) => startDrag(event, clip, "trim-start")}
              className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize border-r border-white/50 bg-white/15"
            />
            <i
              aria-label="裁剪结尾"
              onMouseDown={(event) => startDrag(event, clip, "trim-end")}
              className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize border-l border-white/50 bg-white/15"
            />
          </button>
        )
      })}
    </TimelineTrack>
  )
}
