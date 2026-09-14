import { useEffect, useMemo, useState } from "react"
import { inspectMediaFrameTimeline, type MediaFrameTimeline } from "../../video/services/mediaFrameTimeService"

const timelineCache = new Map<string, MediaFrameTimeline>()

interface UseMediaFrameTimelineInput {
  sourceUrl: string | null
  mediaKey: string
  declaredFrameRate: number
}

export default function useMediaFrameTimeline({ sourceUrl, mediaKey, declaredFrameRate }: UseMediaFrameTimelineInput) {
  const cacheKey = useMemo(() => `${mediaKey}:${declaredFrameRate}`, [declaredFrameRate, mediaKey])
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [timeline, setTimeline] = useState<MediaFrameTimeline | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sourceUrl || !mediaKey) {
      setStatus("idle")
      setTimeline(null)
      setError(null)
      return
    }
    const cached = timelineCache.get(cacheKey)
    if (cached) {
      setTimeline(cached)
      setStatus("ready")
      setError(null)
      return
    }
    const controller = new AbortController()
    setStatus("loading")
    setTimeline(null)
    setError(null)
    void inspectMediaFrameTimeline(sourceUrl, declaredFrameRate, controller.signal).then((nextTimeline) => {
      if (controller.signal.aborted) return
      timelineCache.set(cacheKey, nextTimeline)
      setTimeline(nextTimeline)
      setStatus("ready")
    }).catch((cause) => {
      if (controller.signal.aborted) return
      setStatus("error")
      setError(cause instanceof Error ? cause.message : "无法验证媒体 PTS。")
    })
    return () => controller.abort()
  }, [cacheKey, declaredFrameRate, mediaKey, sourceUrl])

  return { status, timeline, error }
}
