import { useEffect, useState } from "react"
import { RotateCcw } from "lucide-react"
import { Button } from "../../../components/ui/button"
import type { MediaSourceFingerprint } from "../../project/types"
import { createFrameThumbnailDecoder, type FrameThumbnailResource } from "../../video/services/frameThumbnailService"
import { frameToTimestamp, type MediaFrameTimeline } from "../../video/services/mediaFrameTimeService"

interface BoundaryFramePairProps {
  projectId: string
  sourceUrl: string
  mediaFingerprint: MediaSourceFingerprint | null
  timebase: MediaFrameTimeline | null
  boundaryFrame: number
}

function timecode(seconds: number) {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(3).padStart(6, "0")}`
}

export default function BoundaryFramePair({ projectId, sourceUrl, mediaFingerprint, timebase, boundaryFrame }: BoundaryFramePairProps) {
  const [retry, setRetry] = useState(0)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [resources, setResources] = useState<FrameThumbnailResource[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let decoder: Awaited<ReturnType<typeof createFrameThumbnailDecoder>> | null = null
    const created: FrameThumbnailResource[] = []
    setStatus("loading")
    setResources([])
    setError(null)
    const frames = [boundaryFrame - 1, boundaryFrame]
    if (!sourceUrl || !mediaFingerprint || !timebase || frames.some((frame) => frame < 0 || frame >= timebase.totalFrames)) {
      setStatus("error")
      setError("边界不在可呈现帧范围内，无法建立双帧证据。")
      return () => { active = false }
    }
    void (async () => {
      try {
        decoder = await createFrameThumbnailDecoder({ projectId, sourceUrl, mediaFingerprint, durationSeconds: timebase.durationSeconds, frameRate: timebase.frameRate, presentationTimestamps: timebase.points.map((point) => point.timestamp), presentationDurations: timebase.points.map((point) => point.duration) })
        for (const frame of frames) {
          const resource = await decoder.capture(frame, () => active)
          created.push(resource)
        }
        if (!active) return
        setResources(created)
        setStatus("ready")
      } catch (cause) {
        created.forEach((resource) => URL.revokeObjectURL(resource.url))
        if (!active) return
        setStatus("error")
        setError(cause instanceof Error ? cause.message : "双帧解码失败。")
      } finally {
        decoder?.dispose()
      }
    })()
    return () => {
      active = false
      decoder?.dispose()
      created.forEach((resource) => URL.revokeObjectURL(resource.url))
    }
  }, [boundaryFrame, mediaFingerprint, projectId, retry, sourceUrl, timebase])

  if (status === "error") return <div role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-[10px] text-red-100"><p>无法读取边界双帧</p><p className="mt-1 text-red-100/75">{error}</p><Button type="button" variant="outline" size="xs" onClick={() => setRetry((value) => value + 1)} className="mt-2 h-7 gap-1.5"><RotateCcw className="size-3" />重试解码</Button></div>
  if (status === "loading" || resources.length !== 2) return <div className="grid grid-cols-2 gap-1.5" aria-label="正在读取边界双帧"><div className="aspect-video animate-pulse rounded bg-white/8" /><div className="aspect-video animate-pulse rounded bg-white/8" /></div>

  return <div className="grid grid-cols-2 gap-1.5" aria-label="边界双帧证据">{resources.map((resource, index) => { const frame = boundaryFrame - 1 + index; return <figure key={resource.frame} className="min-w-0 overflow-hidden rounded-lg border border-border bg-bg-deep"><img src={resource.url} alt={`${index === 0 ? "前镜末帧" : "后镜首帧"}，第 ${frame} 帧`} className="aspect-video w-full object-cover" /><figcaption className="p-1.5 text-[9px] leading-4"><div className="flex items-center justify-between gap-1"><span className="font-medium text-text-base">{index === 0 ? "前镜末帧" : "后镜首帧"}</span><span className="font-mono text-accent">F {frame}</span></div><span className="font-mono text-text-muted">PTS {timecode(frameToTimestamp(timebase!, frame))}</span></figcaption></figure> })}</div>
}
