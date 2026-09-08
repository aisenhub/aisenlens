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
  const durations = shots.map((shot) => {
    const range = shotFrames[shot.id]
    return range && safeFrameRate ? Math.max(0, (range.last - range.first + 1) / safeFrameRate) : Math.max(0, shot.duration)
  }).filter((duration) => Number.isFinite(duration) && duration > 0).sort((a, b) => a - b)
  const total = durationSeconds > 0 ? durationSeconds : durations.reduce((sum, duration) => sum + duration, 0)
  const cuts = shots.filter((shot) => shot.start > 0).length
  const windowSeconds = 10
  const cutsPerMinute = safeFrameRate && total > 0 ? (cuts / Math.max(1, total)) * 60 : null
  const median = durations.length ? durations[Math.floor(durations.length / 2)] : null
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
    segments: shots.map((shot, index) => ({ id: shot.id, startSeconds: Math.max(0, shot.start), durationSeconds: Math.max(0, shot.duration), index })),
  }
}
