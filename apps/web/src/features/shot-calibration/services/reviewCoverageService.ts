import type { CalibrationReviewRange } from "../types.ts"

export interface CoverageSegment { startFrame: number; endFrame: number }

export function mergeCoverageRanges(ranges: readonly CoverageSegment[], totalFrames: number): CoverageSegment[] {
  const sorted = ranges.filter((range) => range.endFrame > range.startFrame).map((range) => ({ startFrame: Math.max(0, Math.min(totalFrames, range.startFrame)), endFrame: Math.max(0, Math.min(totalFrames, range.endFrame)) })).filter((range) => range.endFrame > range.startFrame).sort((a, b) => a.startFrame - b.startFrame)
  return sorted.reduce<CoverageSegment[]>((merged, range) => {
    const last = merged.at(-1)
    if (last && range.startFrame <= last.endFrame) last.endFrame = Math.max(last.endFrame, range.endFrame)
    else merged.push({ ...range })
    return merged
  }, [])
}

export function coverageFrames(ranges: readonly CoverageSegment[]): number {
  return ranges.reduce((total, range) => total + Math.max(0, range.endFrame - range.startFrame), 0)
}

export function deriveCoverage(ranges: readonly CalibrationReviewRange[], kind: CalibrationReviewRange["kind"]): CoverageSegment[] {
  return mergeCoverageRanges(ranges.filter((range) => range.kind === kind), Number.MAX_SAFE_INTEGER)
}

export function addPlaybackCoverage(ranges: readonly CalibrationReviewRange[], startFrame: number, endFrame: number, now = new Date().toISOString()): CalibrationReviewRange[] {
  const merged = mergeCoverageRanges([...ranges.filter((range) => range.kind === "playback"), { startFrame, endFrame }], Number.MAX_SAFE_INTEGER)
  return [...ranges.filter((range) => range.kind !== "playback"), ...merged.map((range, index) => ({ id: ranges.find((item) => item.kind === "playback" && item.startFrame === range.startFrame)?.id ?? `playback-range:${index}:${range.startFrame}`, startFrame: range.startFrame, endFrame: range.endFrame, kind: "playback" as const, createdAt: now }))].sort((a, b) => a.startFrame - b.startFrame)
}
