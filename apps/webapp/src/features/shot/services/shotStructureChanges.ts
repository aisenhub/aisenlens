import type { ShotGroupRecord } from "../../group/types.ts"
import { reconcileShotGroups } from "../../group/services/reconcileShotGroups.ts"
import type { StructureChangeSet } from "../../group/services/structureCommands.ts"

export type ShotStructureChange =
  | { kind: "split"; originalShotId: string; newShotId: string }
  | { kind: "merge"; retainedShotId: string; removedShotId: string }

export type ShotStructureChangeResult =
  | { ok: true; groups: ShotGroupRecord[]; changedGroupIds: string[]; changes: StructureChangeSet }
  | { ok: false; reason: string }

function groupContains(group: ShotGroupRecord, shotId: string): boolean {
  return group.shotIds.includes(shotId)
}

function changedGroupIds(previous: readonly ShotGroupRecord[], next: readonly ShotGroupRecord[]): string[] {
  return next
    .filter((group) => previous.find((item) => item.id === group.id)?.shotIds.join("\u0000") !== group.shotIds.join("\u0000"))
    .map((group) => group.id)
}

function groupChanges(previous: readonly ShotGroupRecord[], next: readonly ShotGroupRecord[]): StructureChangeSet {
  const previousIds = new Set(previous.map((group) => group.id))
  const nextIds = new Set(next.map((group) => group.id))
  return {
    createdGroupIds: next.filter((group) => !previousIds.has(group.id)).map((group) => group.id),
    removedGroupIds: previous.filter((group) => !nextIds.has(group.id)).map((group) => group.id),
    rangeChangedGroupIds: next.filter((group) => {
      const before = previous.find((item) => item.id === group.id)
      return Boolean(before && before.shotIds.join("\u0000") !== group.shotIds.join("\u0000"))
    }).map((group) => group.id),
    idMap: Object.fromEntries(previous.filter((group) => !nextIds.has(group.id)).map((group) => [group.id, null])),
  }
}

/**
 * Coordinates a manual split with existing structure membership. The new shot
 * inherits every structure that contained the original shot, preserving the
 * chronological membership contract before the groups are reconciled.
 */
export function applyShotSplitToGroups(input: {
  groups: readonly ShotGroupRecord[]
  orderedShotIds: readonly string[]
  originalShotId: string
  newShotId: string
  now: string
}): ShotStructureChangeResult {
  if (!input.orderedShotIds.includes(input.originalShotId)) return { ok: false, reason: "找不到待分割的原镜头。" }
  if (input.orderedShotIds.includes(input.newShotId)) return { ok: false, reason: "分割产生的镜头 ID 已存在，请重试。" }

  const nextOrder = input.orderedShotIds.flatMap((id) => id === input.originalShotId ? [id, input.newShotId] : [id])
  const next = input.groups.map((group) => {
    if (!groupContains(group, input.originalShotId)) return group
    const shotIds = group.shotIds.flatMap((id) => id === input.originalShotId ? [id, input.newShotId] : [id])
    return { ...group, shotIds, updatedAt: input.now }
  })
  const reconciled = reconcileShotGroups(next, nextOrder)
  return { ok: true, groups: reconciled, changedGroupIds: changedGroupIds(input.groups, reconciled), changes: groupChanges(input.groups, reconciled) }
}

/**
 * Coordinates a manual merge without silently creating overlapping structures.
 * If both shots belong to different structures at the same level, the caller
 * must merge those structures first; otherwise the retained shot replaces the
 * removed shot in the shared membership set.
 */
export function applyShotMergeToGroups(input: {
  groups: readonly ShotGroupRecord[]
  orderedShotIds: readonly string[]
  retainedShotId: string
  removedShotId: string
  now: string
}): ShotStructureChangeResult {
  const retainedIndex = input.orderedShotIds.indexOf(input.retainedShotId)
  const removedIndex = input.orderedShotIds.indexOf(input.removedShotId)
  if (retainedIndex < 0 || removedIndex < 0) return { ok: false, reason: "找不到待合并的镜头。" }
  if (removedIndex !== retainedIndex + 1) return { ok: false, reason: "只能合并时间相邻的镜头。" }

  const kinds = new Set(input.groups.map((group) => group.kind))
  for (const kind of kinds) {
    const retainedGroups = input.groups.filter((group) => group.kind === kind && groupContains(group, input.retainedShotId)).map((group) => group.id)
    const removedGroups = input.groups.filter((group) => group.kind === kind && groupContains(group, input.removedShotId)).map((group) => group.id)
    if (retainedGroups.length && removedGroups.length && (retainedGroups.length !== removedGroups.length || retainedGroups.some((id) => !removedGroups.includes(id)))) {
      return { ok: false, reason: `合并会让${kind === "scene" ? "场景" : kind === "sequence" ? "序列" : "段落"}成员产生冲突，请先合并或调整结构。` }
    }
  }

  const nextOrder = input.orderedShotIds.filter((id) => id !== input.removedShotId)
  const next = input.groups.map((group) => {
    if (!groupContains(group, input.removedShotId)) return group
    let retainedSeen = false
    const shotIds = group.shotIds.flatMap((id) => {
      const nextId = id === input.removedShotId ? input.retainedShotId : id
      if (nextId !== input.retainedShotId) return [nextId]
      if (retainedSeen) return []
      retainedSeen = true
      return [nextId]
    })
    return { ...group, shotIds, updatedAt: input.now }
  })
  const reconciled = reconcileShotGroups(next, nextOrder)
  return { ok: true, groups: reconciled, changedGroupIds: changedGroupIds(input.groups, reconciled), changes: groupChanges(input.groups, reconciled) }
}
