import type { ShotGroupRecord } from "../types"

export interface StructureContextShot {
  id: string
  startFrame?: number
  endFrame?: number
  start?: number
  duration?: number
}

export interface StructureContextAtFrame {
  shotId: string | null
  sceneId: string | null
  sequenceId: string | null
  sectionId: string | null
  issues: string[]
}

function shotFrameRange(shot: StructureContextShot, frameRate: number) {
  if (Number.isSafeInteger(shot.startFrame) && Number.isSafeInteger(shot.endFrame)) {
    return { start: shot.startFrame as number, end: shot.endFrame as number }
  }
  if (typeof shot.start === "number" && typeof shot.duration === "number") {
    return { start: Math.round(shot.start * frameRate), end: Math.round((shot.start + shot.duration) * frameRate) }
  }
  return null
}

export function resolveStructureContextAtFrame(input: {
  frame: number
  shots: readonly StructureContextShot[]
  groups: readonly ShotGroupRecord[]
  frameRate?: number
}): StructureContextAtFrame {
  const frameRate = Number.isFinite(input.frameRate) && (input.frameRate ?? 0) > 0 ? input.frameRate as number : 24
  const issues: string[] = []
  const ranges = new Map(input.shots.map((shot) => [shot.id, shotFrameRange(shot, frameRate)]))
  const containingShotIds = input.shots.filter((shot) => {
    const range = ranges.get(shot.id)
    return Boolean(range && range.start <= input.frame && input.frame < range.end)
  }).map((shot) => shot.id)
  if (containingShotIds.length > 1) issues.push("当前帧同时落在多个镜头中，结构上下文需要复核。")

  const context: StructureContextAtFrame = {
    shotId: containingShotIds.length === 1 ? containingShotIds[0] ?? null : null,
    sceneId: null,
    sequenceId: null,
    sectionId: null,
    issues,
  }
  for (const kind of ["scene", "sequence", "section"] as const) {
    const matches = input.groups.filter((group) => {
      if (group.kind !== kind || !group.shotIds.length) return false
      const memberIndexes = group.shotIds.map((id) => input.shots.findIndex((shot) => shot.id === id))
      const orderedIndexes = [...memberIndexes].sort((left, right) => left - right)
      if (orderedIndexes.some((index) => index < 0) || orderedIndexes.some((index, position) => index !== orderedIndexes[0] + position)) {
        const validMemberRanges = group.shotIds.map((id) => ranges.get(id)).filter((range): range is { start: number; end: number } => Boolean(range && range.start < range.end))
        const boundingStart = validMemberRanges.length ? Math.min(...validMemberRanges.map((range) => range.start)) : null
        const boundingEnd = validMemberRanges.length ? Math.max(...validMemberRanges.map((range) => range.end)) : null
        if (group.shotIds.includes(context.shotId ?? "") || boundingStart !== null && boundingEnd !== null && boundingStart <= input.frame && input.frame < boundingEnd) issues.push(`结构“${group.title}”不是连续镜头范围，需要复核。`)
        return false
      }
      const memberRanges = orderedIndexes.map((index) => shotFrameRange(input.shots[index]!, frameRate))
      if (memberRanges.some((range) => !range || range.start >= range.end)) {
        if (group.shotIds.includes(context.shotId ?? "")) issues.push(`结构“${group.title}”缺少可靠镜头范围。`)
        return false
      }
      const start = memberRanges[0]!.start
      const end = memberRanges[memberRanges.length - 1]!.end
      return start <= input.frame && input.frame < end
    })
    if (matches.length > 1) {
      issues.push(`${kind} 结构范围重叠，无法可靠选择唯一上下文。`)
      continue
    }
    const match = matches[0]
    if (kind === "scene") context.sceneId = match?.id ?? null
    if (kind === "sequence") context.sequenceId = match?.id ?? null
    if (kind === "section") context.sectionId = match?.id ?? null
  }
  return context
}
