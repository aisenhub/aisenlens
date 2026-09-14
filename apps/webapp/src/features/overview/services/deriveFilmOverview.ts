import type { ShotData } from "../../editor/constants/editorData.ts"
import type { AnnotationMarker } from "../../annotation/types"
import type { ShotGroupRecord } from "../../group/types"

export interface FilmOverviewFacts {
  shotCount: number
  groupCount: number
  markerCount: number
  totalDurationSeconds: number | null
  averageShotSeconds: number | null
  medianShotSeconds: number | null
  shortestShotSeconds: number | null
  longestShotSeconds: number | null
  cutsPerMinute: number | null
  cutsWindowSeconds: number
  densityWindows: Array<{ startSeconds: number; durationSeconds: number; cutCount: number; cutsPerMinute: number | null }>
  segments: Array<{ id: string; startSeconds: number; durationSeconds: number; index: number }>
}

interface DeriveFilmOverviewInput {
  shots: ShotData[]
  shotFrames: Record<string, { first: number; last: number }>
  groups: ShotGroupRecord[]
  markers: AnnotationMarker[]
  durationSeconds: number
  frameRate: number | null
}

export default function deriveFilmOverview({ shots, shotFrames, groups, markers, durationSeconds, frameRate }: DeriveFilmOverviewInput): FilmOverviewFacts {
  const safeFrameRate = Number.isFinite(frameRate) && frameRate && frameRate > 0 ? frameRate : null
  const segments = shots.map((shot, index) => {
    const range = shotFrames[shot.id]
    const startSeconds = range && safeFrameRate ? Math.max(0, range.first / safeFrameRate) : Math.max(0, shot.start)
    const duration = range && safeFrameRate ? Math.max(0, (range.last - range.first + 1) / safeFrameRate) : Math.max(0, shot.duration)
    return { id: shot.id, startSeconds, durationSeconds: duration, index }
  }).filter((segment) => Number.isFinite(segment.startSeconds) && Number.isFinite(segment.durationSeconds) && segment.durationSeconds > 0)
  const durations = segments.map((segment) => segment.durationSeconds).sort((a, b) => a - b)
  const coverageEnd = segments.reduce((end, segment) => Math.max(end, segment.startSeconds + segment.durationSeconds), 0)
  const total = durationSeconds > 0 ? durationSeconds : coverageEnd
  const cuts = segments.map((segment) => segment.startSeconds).filter((start) => start > 0 && start < total)
  const windowSeconds = 10
  const cutsPerMinute = total > 0 ? (cuts.length / Math.max(1, total)) * 60 : null
  const middle = Math.floor(durations.length / 2)
  const median = durations.length ? (durations.length % 2 ? durations[middle] : (durations[middle - 1] + durations[middle]) / 2) : null
  const densityWindows = total > 0 ? Array.from({ length: Math.ceil(total / windowSeconds) }, (_, index) => {
    const startSeconds = index * windowSeconds
    const actualDuration = Math.min(windowSeconds, total - startSeconds)
    const cutCount = cuts.filter((cut) => cut >= startSeconds && cut < startSeconds + actualDuration).length
    return { startSeconds, durationSeconds: actualDuration, cutCount, cutsPerMinute: actualDuration > 0 ? (cutCount / actualDuration) * 60 : null }
  }) : []
  return {
    shotCount: shots.length,
    groupCount: groups.length,
    markerCount: markers.length,
    totalDurationSeconds: total > 0 ? total : null,
    averageShotSeconds: durations.length ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length : null,
    medianShotSeconds: median,
    shortestShotSeconds: durations[0] ?? null,
    longestShotSeconds: durations.at(-1) ?? null,
    cutsPerMinute,
    cutsWindowSeconds: windowSeconds,
    densityWindows,
    segments,
  }
}
