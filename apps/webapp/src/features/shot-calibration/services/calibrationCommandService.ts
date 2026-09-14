import type { CalibrationCommand, CalibrationCommandResult, CalibrationDraft } from "../types.ts"
import { deriveCalibrationSegments, validateCalibrationDraft } from "./calibrationDraftService.ts"

function invalidateStructuralReviewRanges(
  draft: CalibrationDraft,
  startFrame: number,
  endFrame: number,
) {
  // A structural edit invalidates only explicit confirmation in its affected
  // window. Playback coverage remains useful as an observational trace.
  return draft.reviewRanges.flatMap((range) => {
    if (range.kind !== "explicit" || range.endFrame <= startFrame || range.startFrame >= endFrame) return [range]
    const pieces = []
    if (range.startFrame < startFrame) pieces.push({ ...range, endFrame: startFrame })
    if (range.endFrame > endFrame) pieces.push({ ...range, id: `${range.id}:tail`, startFrame: endFrame })
    return pieces.filter((piece) => piece.endFrame > piece.startFrame)
  })
}

export class CalibrationCommandError extends Error {
  readonly code: "revision-conflict" | "invalid-frame" | "at-boundary" | "not-found" | "duplicate-issue"

  constructor(code: "revision-conflict" | "invalid-frame" | "at-boundary" | "not-found" | "duplicate-issue", message: string) {
    super(message)
    this.name = "CalibrationCommandError"
    this.code = code
  }
}

function withRevision(draft: CalibrationDraft, changes: Partial<CalibrationDraft>): CalibrationDraft {
  const next = { ...structuredClone(draft), ...changes, revision: draft.revision + 1, updatedAt: new Date().toISOString() }
  validateCalibrationDraft(next)
  return next
}

function finish(draft: CalibrationDraft, next: CalibrationDraft, startFrame: number, endFrame: number): CalibrationCommandResult {
  return { draft: next, changed: next.revision !== draft.revision, affectedFrames: { startFrame, endFrame } }
}

export function applyCalibrationCommand(draft: CalibrationDraft, command: CalibrationCommand): CalibrationCommandResult {
  if (command.expectedRevision !== draft.revision) throw new CalibrationCommandError("revision-conflict", "校准草稿已更新，请重新加载后再试。")
  if (command.type === "splitAtFrame") {
    const segment = draft.segments.find((item) => command.frame > item.startFrame && command.frame < item.endFrame)
    if (!segment) {
      if (command.frame <= 0 || command.frame >= draft.timebase.totalFrames) throw new CalibrationCommandError("invalid-frame", "只能在视频内部帧切开。")
      throw new CalibrationCommandError("at-boundary", "当前帧已经是切点，或不在当前镜头内。")
    }
    const id = `manual-boundary:${crypto.randomUUID()}`
    const boundary = { id, frame: command.frame, source: "manual" as const, candidateId: null, originalFrame: null, wasManuallyAdjusted: false, transitionRange: null }
    const nextBoundaries = [...draft.boundaries, boundary].sort((a, b) => a.frame - b.frame)
    const affectedStart = Math.max(0, command.frame - 1)
    const affectedEnd = Math.min(draft.timebase.totalFrames, command.frame + 1)
    const next = withRevision(draft, { boundaries: nextBoundaries, segments: deriveCalibrationSegments(draft.timebase.totalFrames, nextBoundaries, [], [], draft.segments), reviewRanges: invalidateStructuralReviewRanges(draft, affectedStart, affectedEnd) })
    return finish(draft, next, affectedStart, affectedEnd)
  }
  if (command.type === "moveBoundary") {
    const boundaryIndex = draft.boundaries.findIndex((item) => item.id === command.boundaryId)
    if (boundaryIndex < 0) throw new CalibrationCommandError("not-found", "切点不存在或已被移除。")
    const current = draft.boundaries[boundaryIndex]!
    const previous = boundaryIndex === 0 ? 0 : draft.boundaries[boundaryIndex - 1]!.frame
    const nextBoundary = boundaryIndex === draft.boundaries.length - 1 ? draft.timebase.totalFrames : draft.boundaries[boundaryIndex + 1]!.frame
    const requested = Math.round(command.frame)
    const frame = Math.max(previous + 1, Math.min(nextBoundary - 1, requested))
    if (frame === current.frame) return finish(draft, draft, Math.max(0, frame - 1), Math.min(draft.timebase.totalFrames, frame + 1))
    const nextBoundaries = draft.boundaries.map((item, index) => index === boundaryIndex ? { ...item, frame, wasManuallyAdjusted: true } : item).sort((a, b) => a.frame - b.frame)
    const affectedStart = Math.max(0, Math.min(current.frame, frame) - 1)
    const affectedEnd = Math.min(draft.timebase.totalFrames, Math.max(current.frame, frame) + 1)
    const next = withRevision(draft, { boundaries: nextBoundaries, segments: deriveCalibrationSegments(draft.timebase.totalFrames, nextBoundaries, [], [], draft.segments), reviewRanges: invalidateStructuralReviewRanges(draft, affectedStart, affectedEnd) })
    return finish(draft, next, affectedStart, affectedEnd)
  }
  if (command.type === "removeBoundary") {
    const index = draft.boundaries.findIndex((item) => item.id === command.boundaryId)
    if (index < 0) throw new CalibrationCommandError("not-found", "切点不存在或已被移除。")
    const frame = draft.boundaries[index]!.frame
    const nextBoundaries = draft.boundaries.filter((item) => item.id !== command.boundaryId)
    const affectedStart = Math.max(0, frame - 1)
    const affectedEnd = Math.min(draft.timebase.totalFrames, frame + 1)
    const next = withRevision(draft, { boundaries: nextBoundaries, segments: deriveCalibrationSegments(draft.timebase.totalFrames, nextBoundaries, [], [], draft.segments), reviewRanges: invalidateStructuralReviewRanges(draft, affectedStart, affectedEnd) })
    return finish(draft, next, affectedStart, affectedEnd)
  }
  if (command.type === "addReviewIssue") {
    const endFrame = command.endFrame ?? command.frame + 1
    if (command.frame < 0 || endFrame <= command.frame || endFrame > draft.timebase.totalFrames) throw new CalibrationCommandError("invalid-frame", "待回看范围无效。")
    const duplicate = draft.issues.some((issue) => issue.status === "pending" && issue.frame === command.frame && issue.endFrame === (command.endFrame ?? null))
    if (duplicate) throw new CalibrationCommandError("duplicate-issue", "这个位置已经在待回看清单中。")
    const now = new Date().toISOString()
    const issue = { id: `review-issue:${crypto.randomUUID()}`, frame: command.frame, endFrame: command.endFrame ?? null, note: command.note?.trim() ?? "", status: "pending" as const, createdAt: now, updatedAt: now }
    return finish(draft, withRevision(draft, { issues: [...draft.issues, issue] }), command.frame, endFrame)
  }
  if (command.type === "resolveIssue") {
    if (!draft.issues.some((issue) => issue.id === command.issueId)) throw new CalibrationCommandError("not-found", "待回看项不存在。")
    const next = withRevision(draft, { issues: draft.issues.map((issue) => issue.id === command.issueId ? { ...issue, status: "resolved" as const, updatedAt: new Date().toISOString() } : issue) })
    const issue = next.issues.find((item) => item.id === command.issueId)!
    return finish(draft, next, issue.frame, issue.endFrame ?? issue.frame + 1)
  }
  if (command.type === "addReviewRange") {
    if (command.startFrame < 0 || command.endFrame <= command.startFrame || command.endFrame > draft.timebase.totalFrames) throw new CalibrationCommandError("invalid-frame", "复核范围无效。")
    const merged = [...draft.reviewRanges, { id: `review-range:${crypto.randomUUID()}`, startFrame: command.startFrame, endFrame: command.endFrame, kind: command.kind, createdAt: new Date().toISOString() }].sort((a, b) => a.startFrame - b.startFrame)
    const compacted = merged.reduce<typeof merged>((all, range) => {
      const last = all.at(-1)
      if (last && last.kind === range.kind && range.startFrame <= last.endFrame) last.endFrame = Math.max(last.endFrame, range.endFrame)
      else all.push({ ...range })
      return all
    }, [])
    return finish(draft, withRevision(draft, { reviewRanges: compacted }), command.startFrame, command.endFrame)
  }
  return finish(draft, draft, 0, 0)
}

export function assertRangesRemainContinuous(draft: CalibrationDraft): void {
  const expected = deriveCalibrationSegments(draft.timebase.totalFrames, draft.boundaries, [], [], draft.segments)
  if (draft.segments.length !== expected.length || draft.segments.some((range, index) => range.startFrame !== expected[index]!.startFrame || range.endFrame !== expected[index]!.endFrame)) throw new Error("校准区段不连续。")
}
