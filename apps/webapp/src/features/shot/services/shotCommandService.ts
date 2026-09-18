import type { ShotFrameRange, ShotRecord } from "../types.ts"
import { mergeAdjacentShotRanges, moveSharedShotBoundary } from "./shotBoundaryService.ts"
import { splitManualShotAtFrame, type ManualShotSplitFailureCode } from "./manualShotService.ts"

export type ShotCommand =
  | { type: "move-boundary"; boundaryIndex: number; frame: number }
  | { type: "split"; shotId: string | null; frame: number; newShotId: string }
  | { type: "merge"; firstIndex: number }

export type ShotCommandResult =
  | { ok: true; shots: ShotRecord[]; affectedShotIds: string[] }
  | { ok: false; code: ManualShotSplitFailureCode | "boundary-not-found" | "shots-not-adjacent" }

function ranges(shots: readonly ShotRecord[]): ShotFrameRange[] {
  return shots.map(({ id, startFrame, endFrame }) => ({ id, startFrame, endFrame }))
}

function applyRanges(shots: readonly ShotRecord[], nextRanges: readonly ShotFrameRange[]): ShotRecord[] {
  const byId = new Map(nextRanges.map((range) => [range.id, range]))
  return shots.filter((shot) => byId.has(shot.id)).map((shot) => {
    const range = byId.get(shot.id)!
    return { ...shot, startFrame: range.startFrame, endFrame: range.endFrame }
  })
}

export function applyShotCommand(shots: readonly ShotRecord[], command: ShotCommand): ShotCommandResult {
  const current = [...shots]
  if (command.type === "move-boundary") {
    const currentRanges = ranges(current)
    const nextRanges = moveSharedShotBoundary(currentRanges, command.boundaryIndex, command.frame)
    if (!current[command.boundaryIndex] || !current[command.boundaryIndex + 1]) {
      const before = current[command.boundaryIndex]
      const after = current[command.boundaryIndex + 1]
      if (!before || !after) return { ok: false, code: "boundary-not-found" }
    }
    const changed = nextRanges.some((range, index) => range.startFrame !== current[index]?.startFrame || range.endFrame !== current[index]?.endFrame)
    return { ok: true, shots: changed ? applyRanges(current, nextRanges) : current, affectedShotIds: changed ? [current[command.boundaryIndex]!.id, current[command.boundaryIndex + 1]!.id] : [] }
  }
  if (command.type === "split") {
    const result = splitManualShotAtFrame({ ranges: ranges(current), targetShotId: command.shotId, splitFrame: command.frame, createShotId: () => command.newShotId })
    if (!result.ok) return result
    const index = current.findIndex((shot) => shot.id === result.originalRange.id)
    const source = current[index]
    if (!source) return { ok: false, code: "no-active-shot" }
    const now = new Date().toISOString()
    const original = { ...source, endFrame: result.originalRange.endFrame, lineage: { origin: "split" as const, parentShotIds: [source.id] } }
    const created: ShotRecord = { ...source, id: result.newRange.id, startFrame: result.newRange.startFrame, endFrame: result.newRange.endFrame, detection: { source: "manual" }, primaryScreenshotId: null, screenshotIds: [], firstFrameScreenshotId: null, lastFrameScreenshotId: null, revision: 1, lineage: { origin: "split", parentShotIds: [source.id] }, createdAt: now, updatedAt: now }
    return { ok: true, shots: [...current.slice(0, index), original, created, ...current.slice(index + 1)], affectedShotIds: [source.id, created.id] }
  }
  const first = current[command.firstIndex]
  const second = current[command.firstIndex + 1]
  if (!first || !second || first.endFrame !== second.startFrame) return { ok: false, code: "shots-not-adjacent" }
  const nextRanges = mergeAdjacentShotRanges(ranges(current), command.firstIndex)
  const merged: ShotRecord = { ...first, endFrame: nextRanges[command.firstIndex]!.endFrame, screenshotIds: [...new Set([...first.screenshotIds, ...second.screenshotIds])], lastFrameScreenshotId: second.lastFrameScreenshotId, lineage: { origin: "merge", parentShotIds: [first.id, second.id] } }
  return { ok: true, shots: [...current.slice(0, command.firstIndex), merged, ...current.slice(command.firstIndex + 2)], affectedShotIds: [first.id, second.id] }
}
