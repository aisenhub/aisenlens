import { useCallback, useMemo, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"
import { Button } from "../../../components/ui/button"
import type { CalibrationBoundary, CalibrationSegment } from "../types"

type TimelineScope = "film" | "segment"

interface CalibrationTimelineProps {
  segments: readonly CalibrationSegment[]
  boundaries: readonly CalibrationBoundary[]
  frameRate: number
  totalFrames: number
  currentFrame: number
  selectedSegment: CalibrationSegment | null
  selectedSegmentIndex: number
  onSelectSegment: (segment: CalibrationSegment) => void
  onSeekFrame: (frame: number) => void
}

function formatTime(frame: number, frameRate: number) {
  const seconds = frameRate > 0 ? frame / frameRate : 0
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, "0")}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function chooseTickStep(rangeFrames: number, frameRate: number) {
  const rangeSeconds = frameRate > 0 ? rangeFrames / frameRate : 0
  const target = Math.max(0.5, rangeSeconds / 8)
  const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]
  const seconds = steps.find((step) => step >= target) ?? 600
  return Math.max(1, Math.round(seconds * Math.max(1, frameRate)))
}

export default function CalibrationTimeline({ segments, boundaries, frameRate, totalFrames, currentFrame, selectedSegment, selectedSegmentIndex, onSelectSegment, onSeekFrame }: CalibrationTimelineProps) {
  const [scope, setScope] = useState<TimelineScope>("film")
  const [isDragging, setIsDragging] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const safeTotalFrames = Math.max(1, totalFrames)
  const activeSegment = selectedSegment ?? segments.find((segment) => currentFrame >= segment.startFrame && currentFrame < segment.endFrame) ?? segments[0] ?? null
  const activeSegmentIndex = activeSegment ? segments.findIndex((segment) => segment.id === activeSegment.id) : selectedSegmentIndex
  const viewStart = scope === "segment" && activeSegment ? activeSegment.startFrame : 0
  const viewEnd = scope === "segment" && activeSegment ? Math.max(viewStart + 1, activeSegment.endFrame) : safeTotalFrames
  const viewRange = Math.max(1, viewEnd - viewStart)
  const playheadFrame = clamp(currentFrame, viewStart, Math.max(viewStart, viewEnd - 1))
  const tickStep = chooseTickStep(viewRange, frameRate)
  const ticks = useMemo(() => {
    const result: number[] = []
    const first = Math.ceil(viewStart / tickStep) * tickStep
    for (let frame = first; frame <= viewEnd; frame += tickStep) result.push(frame)
    if (!result.length || result[0] > viewStart) result.unshift(viewStart)
    return result
  }, [tickStep, viewEnd, viewStart])

  const toFrame = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return null
    return Math.round(viewStart + clamp((clientX - rect.left) / rect.width, 0, 1) * viewRange)
  }, [viewRange, viewStart])

  const seekFromPointer = useCallback((clientX: number) => {
    const frame = toFrame(clientX)
    if (frame !== null) onSeekFrame(clamp(frame, viewStart, Math.max(viewStart, viewEnd - 1)))
  }, [onSeekFrame, toFrame, viewEnd, viewStart])

  const startDrag = (event: ReactPointerEvent<HTMLDivElement | HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
    trackRef.current?.setPointerCapture(event.pointerId)
    seekFromPointer(event.clientX)
  }

  const stopDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    event.preventDefault()
    setIsDragging(false)
    if (trackRef.current?.hasPointerCapture(event.pointerId)) trackRef.current.releasePointerCapture(event.pointerId)
  }

  const visibleSegments = scope === "segment" && activeSegment ? [activeSegment] : segments
  const visibleBoundaries = boundaries.filter((boundary) => boundary.frame >= viewStart && boundary.frame <= viewEnd)
  const position = (frame: number) => `${clamp((frame - viewStart) / viewRange, 0, 1) * 100}%`

  return <section className="rounded-lg border border-border bg-bg-input/20 p-3" aria-label="校准时间轴">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-xs font-medium">校准时间轴</h2>
        <p className="mt-0.5 text-[10px] text-text-muted">拖动播放头定位，点击分镜块切换当前边界。</p>
      </div>
      <div className="flex items-center gap-1 rounded-md border border-border bg-bg-panel p-0.5" aria-label="时间轴范围">
        <Button type="button" size="xs" variant={scope === "film" ? "secondary" : "ghost"} aria-pressed={scope === "film"} onClick={() => setScope("film")}>全片</Button>
        <Button type="button" size="xs" variant={scope === "segment" ? "secondary" : "ghost"} aria-pressed={scope === "segment"} disabled={!activeSegment} onClick={() => setScope("segment")}>当前分镜</Button>
      </div>
    </div>
    <div
      ref={trackRef}
      className={`relative mt-3 select-none rounded-md border border-border/80 bg-black/40 ${isDragging ? "cursor-grabbing" : "cursor-crosshair"}`}
      onPointerDown={startDrag}
      onPointerMove={(event) => { if (isDragging) seekFromPointer(event.clientX) }}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
    >
      <div className="relative h-8 border-b border-border/70 px-1">
        {ticks.map((frame) => <div key={frame} className="absolute inset-y-0 flex -translate-x-1/2 flex-col items-center" style={{ left: position(frame) }}><span className="h-2 w-px bg-border" /><span className="mt-1 whitespace-nowrap font-mono text-[9px] text-text-muted">{formatTime(frame, frameRate)}</span></div>)}
      </div>
      <div className="relative h-14 overflow-hidden px-1 py-2">
        <div className="pointer-events-none absolute inset-x-1 top-1/2 h-px bg-border/60" />
        {visibleSegments.map((segment) => {
          const index = segments.findIndex((item) => item.id === segment.id)
          const left = position(segment.startFrame)
          const right = position(segment.endFrame)
          const width = Math.max(0.8, Number.parseFloat(right) - Number.parseFloat(left))
          const selected = segment.id === selectedSegment?.id
          return <button key={segment.id} type="button" title={`镜头 ${String(index + 1).padStart(2, "0")} · ${formatTime(segment.startFrame, frameRate)} – ${formatTime(segment.endFrame, frameRate)}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => onSelectSegment(segment)} className={`absolute inset-y-2 z-10 overflow-hidden rounded border px-1.5 text-left transition-colors ${selected ? "border-accent bg-accent/30 text-text-base" : "border-sky-300/40 bg-sky-300/10 text-text-muted hover:border-sky-200/70 hover:bg-sky-300/20"}`} style={{ left, width: `${width}%` }}><span className="block truncate text-[10px] font-medium">镜头 {String(index + 1).padStart(2, "0")}</span><span className="block truncate font-mono text-[9px] opacity-80">{formatTime(segment.startFrame, frameRate)} – {formatTime(segment.endFrame, frameRate)}</span></button>
        })}
        {visibleBoundaries.map((boundary) => <div key={boundary.id} className="pointer-events-none absolute inset-y-1 z-20 w-px bg-amber-300/80" style={{ left: position(boundary.frame) }} title={`边界 ${formatTime(boundary.frame, frameRate)}`} />)}
        <button type="button" aria-label={`拖动播放头，当前第 ${playheadFrame} 帧`} aria-pressed={isDragging} className={`absolute top-0 z-30 h-full w-4 -translate-x-1/2 cursor-col-resize ${isDragging ? "cursor-grabbing" : "cursor-col-resize"}`} style={{ left: position(playheadFrame) }} onPointerDown={startDrag} onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); onSeekFrame(clamp(playheadFrame + (event.key === "ArrowLeft" ? -1 : 1), viewStart, Math.max(viewStart, viewEnd - 1))) } }}><span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-accent" /><span className="absolute left-1/2 top-0 size-3 -translate-x-1/2 rounded-b-sm bg-accent" /></button>
      </div>
    </div>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[10px] text-text-muted">
      <span>第 {playheadFrame} 帧 · {formatTime(playheadFrame, frameRate)} · {scope === "film" ? "全片" : `镜头 ${String(activeSegmentIndex + 1).padStart(2, "0")}`}</span>
      <span>{formatTime(viewStart, frameRate)} – {formatTime(viewEnd, frameRate)}</span>
    </div>
  </section>
}
