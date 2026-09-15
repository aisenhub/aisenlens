import type { ShotGroupKind, ShotGroupRecord } from "../types"
import { getContiguousShotIds } from "./reconcileShotGroups.ts"
import { structureRank, validateStructure, validateStructureMembership } from "./structureValidation.ts"

export interface OrderedStructureShot {
  id: string
  startFrame?: number
  endFrame?: number
}

export interface StructureChangeSet {
  createdGroupIds: string[]
  removedGroupIds: string[]
  rangeChangedGroupIds: string[]
  idMap: Record<string, string | null>
}

export type StructureCommandResult =
  | { ok: true; groups: ShotGroupRecord[]; affectedGroupIds: string[]; changes: StructureChangeSet }
  | { ok: false; reason: string }

interface StructureCommandContext {
  projectId: string
  orderedShots: readonly OrderedStructureShot[]
  existingGroups: readonly ShotGroupRecord[]
  now: string
}

interface BoundaryCommandContext extends StructureCommandContext {
  kind: ShotGroupKind
  afterShotId: string
}

const emptyChanges = (): StructureChangeSet => ({
  createdGroupIds: [],
  removedGroupIds: [],
  rangeChangedGroupIds: [],
  idMap: {},
})

function result(previous: readonly ShotGroupRecord[], next: ShotGroupRecord[], orderedShots: readonly OrderedStructureShot[]): StructureCommandResult {
  const validation = validateStructure(next, orderedShots.map((shot) => shot.id))
  if (!validation.valid) return { ok: false, reason: validation.reason ?? "结构调整不符合层级规则。" }
  const previousIds = new Set(previous.map((group) => group.id))
  const nextIds = new Set(next.map((group) => group.id))
  const changes = emptyChanges()
  next.forEach((group) => {
    if (!previousIds.has(group.id)) changes.createdGroupIds.push(group.id)
    const before = previous.find((item) => item.id === group.id)
    if (before && before.kind === group.kind && before.shotIds.join("\u0000") !== group.shotIds.join("\u0000")) {
      changes.rangeChangedGroupIds.push(group.id)
    }
  })
  previous.forEach((group) => {
    if (!nextIds.has(group.id)) {
      changes.removedGroupIds.push(group.id)
      changes.idMap[group.id] = null
    }
  })
  const affectedGroupIds = [...new Set([...changes.createdGroupIds, ...changes.removedGroupIds, ...changes.rangeChangedGroupIds])]
  if (!affectedGroupIds.length) return { ok: true, groups: next, affectedGroupIds: [], changes }
  return { ok: true, groups: next, affectedGroupIds, changes }
}

function indexesFor(ids: readonly string[], orderedShots: readonly OrderedStructureShot[]): { start: number; end: number } | null {
  if (!ids.length) return null
  const indexes = ids.map((id) => orderedShots.findIndex((shot) => shot.id === id))
  if (indexes.some((index) => index < 0)) return null
  const sorted = [...indexes].sort((left, right) => left - right)
  if (new Set(indexes).size !== indexes.length || sorted.some((index, position) => index !== sorted[0] + position)) return null
  return { start: sorted[0]!, end: sorted.at(-1)! }
}

function groupIndexes(group: ShotGroupRecord, orderedShots: readonly OrderedStructureShot[]) {
  return indexesFor(group.shotIds, orderedShots)
}

function defaultTitle(kind: ShotGroupKind, existingGroups: readonly ShotGroupRecord[]): string {
  const prefix = kind === "scene" ? "场景" : kind === "sequence" ? "序列" : "段落"
  return `${prefix} ${String(existingGroups.filter((group) => group.kind === kind).length + 1).padStart(2, "0")}`
}

function structureId(context: StructureCommandContext, kind: ShotGroupKind, shotIds: readonly string[]): string {
  let hash = 2_166_136_261
  for (const character of `${context.projectId}|${kind}|${shotIds.join(",")}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619) >>> 0
  const base = `structure-${kind}-${hash.toString(36)}`
  const used = new Set(context.existingGroups.map((group) => group.id))
  let id = base
  let suffix = 1
  while (used.has(id)) id = `${base}-${suffix++}`
  return id
}

function createGroup(context: StructureCommandContext, kind: ShotGroupKind, shotIds: string[], title?: string): ShotGroupRecord {
  const now = context.now
  return {
    id: structureId(context, kind, shotIds),
    projectId: context.projectId,
    kind,
    title: title?.trim() || defaultTitle(kind, context.existingGroups),
    summary: "",
    shotIds,
    createdAt: now,
    updatedAt: now,
  }
}

export function createStructureFromSelection(input: StructureCommandContext & { kind: ShotGroupKind; selectedShotIds: readonly string[]; title?: string }): StructureCommandResult {
  const orderedIds = input.orderedShots.map((shot) => shot.id)
  const members = getContiguousShotIds(orderedIds, [...input.selectedShotIds])
  if (!members.length) return { ok: false, reason: "请选择一段连续的正式镜头。" }
  const existing = input.existingGroups.find((group) => group.kind === input.kind && group.shotIds.length === members.length && group.shotIds.every((id) => members.includes(id)))
  if (existing) return { ok: true, groups: [...input.existingGroups], affectedGroupIds: [], changes: emptyChanges() }
  if (input.existingGroups.some((group) => group.kind === input.kind && group.shotIds.some((id) => members.includes(id)))) {
    return { ok: false, reason: "选区与已有同层结构重叠，请使用边界拆分或调整。" }
  }
  const validation = validateStructureMembership({ kind: input.kind, shotIds: members, existingGroups: [...input.existingGroups], orderedShotIds: orderedIds })
  if (!validation.valid) return { ok: false, reason: validation.reason ?? "选区不符合结构层级规则。" }
  const group = createGroup(input, input.kind, members, input.title)
  return result(input.existingGroups, [...input.existingGroups, group], input.orderedShots)
}

export function splitStructureAtBoundary(input: BoundaryCommandContext & { groupId: string }): StructureCommandResult {
  const cutIndex = input.orderedShots.findIndex((shot) => shot.id === input.afterShotId)
  const current = input.existingGroups.find((group) => group.id === input.groupId)
  const indexes = current ? groupIndexes(current, input.orderedShots) : null
  if (!current || current.kind !== input.kind || !indexes || cutIndex < indexes.start || cutIndex >= indexes.end) {
    return { ok: false, reason: "只能在结构内部的正式镜头边界处分割。" }
  }
  const orderedIds = input.orderedShots.map((shot) => shot.id)
  const leftIds = orderedIds.slice(indexes.start, cutIndex + 1)
  const rightIds = orderedIds.slice(cutIndex + 1, indexes.end + 1)
  const now = input.now ?? new Date().toISOString()
  const next = input.existingGroups.flatMap((group) => {
    if (group.id !== current.id) return [group]
    return [
      { ...group, shotIds: leftIds, updatedAt: now },
      { ...createGroup(input, current.kind, rightIds), projectId: current.projectId },
    ]
  })
  return result(input.existingGroups, next, input.orderedShots)
}

export function resolveStructureSpanAtBoundary(input: BoundaryCommandContext & { title?: string }): StructureCommandResult {
  const cutIndex = input.orderedShots.findIndex((shot) => shot.id === input.afterShotId)
  if (cutIndex < 0 || cutIndex >= input.orderedShots.length - 1) return { ok: false, reason: "结构边界必须位于两个相邻正式镜头之间。" }
  const orderedIds = input.orderedShots.map((shot) => shot.id)
  const sameKind = input.existingGroups.filter((group) => group.kind === input.kind)
  const containing = sameKind.find((group) => {
    const indexes = groupIndexes(group, input.orderedShots)
    return indexes && indexes.start <= cutIndex && indexes.end >= cutIndex + 1
  })
  if (containing) return splitStructureAtBoundary({ ...input, groupId: containing.id })
  const left = sameKind.find((group) => groupIndexes(group, input.orderedShots)?.end === cutIndex)
  const right = sameKind.find((group) => groupIndexes(group, input.orderedShots)?.start === cutIndex + 1)
  if (left && right) return { ok: true, groups: [...input.existingGroups], affectedGroupIds: [], changes: emptyChanges() }
  const containingHigher = input.existingGroups
    .filter((group) => structureRank[group.kind] > structureRank[input.kind])
    .map((group) => ({ group, indexes: groupIndexes(group, input.orderedShots) }))
    .filter((item): item is { group: ShotGroupRecord; indexes: { start: number; end: number } } => Boolean(item.indexes && item.indexes.start <= cutIndex && item.indexes.end >= cutIndex + 1))
    .sort((a, b) => (a.indexes.end - a.indexes.start) - (b.indexes.end - b.indexes.start))
  const upper = containingHigher[0]?.indexes ?? { start: 0, end: orderedIds.length - 1 }
  const start = Math.max(upper.start, (left ? groupIndexes(left, input.orderedShots)!.end + 1 : upper.start))
  const end = Math.min(upper.end, (right ? groupIndexes(right, input.orderedShots)!.start - 1 : upper.end))
  if (start > end) return { ok: false, reason: "该位置没有可创建的稀疏结构范围。" }
  const members = orderedIds.slice(start, end + 1)
  if (members.length === 0) return { ok: false, reason: "结构范围不能为空。" }
  const ranges = !left && !right
    ? [orderedIds.slice(start, cutIndex + 1), orderedIds.slice(cutIndex + 1, end + 1)]
    : [members]
  const groups = ranges.filter((range) => range.length > 0).map((range) => createGroup(input, input.kind, range, input.title))
  const validation = validateStructure([...input.existingGroups, ...groups], orderedIds)
  if (!validation.valid) return { ok: false, reason: validation.reason ?? "结构范围不符合层级规则。" }
  return result(input.existingGroups, [...input.existingGroups, ...groups], input.orderedShots)
}

export function moveStructureBoundary(input: StructureCommandContext & { kind: ShotGroupKind; leftGroupId: string; rightGroupId: string; targetAfterShotId: string }): StructureCommandResult {
  const left = input.existingGroups.find((group) => group.id === input.leftGroupId)
  const right = input.existingGroups.find((group) => group.id === input.rightGroupId)
  const targetIndex = input.orderedShots.findIndex((shot) => shot.id === input.targetAfterShotId)
  const leftIndexes = left ? groupIndexes(left, input.orderedShots) : null
  const rightIndexes = right ? groupIndexes(right, input.orderedShots) : null
  if (!left || !right || left.kind !== input.kind || right.kind !== input.kind || !leftIndexes || !rightIndexes || leftIndexes.end + 1 !== rightIndexes.start || targetIndex < leftIndexes.start || targetIndex >= rightIndexes.end) return { ok: false, reason: "只能移动相邻同层结构之间的共享边界。" }
  const ids = input.orderedShots.map((shot) => shot.id)
  const now = input.now ?? new Date().toISOString()
  const next = input.existingGroups.map((group) => group.id === left.id ? { ...group, shotIds: ids.slice(leftIndexes.start, targetIndex + 1), updatedAt: now } : group.id === right.id ? { ...group, shotIds: ids.slice(targetIndex + 1, rightIndexes.end + 1), updatedAt: now } : group)
  return result(input.existingGroups, next, input.orderedShots)
}

export function resizeStructureEdge(input: StructureCommandContext & { groupId: string; kind: ShotGroupKind; edge: "start" | "end"; targetShotId: string }): StructureCommandResult {
  const group = input.existingGroups.find((item) => item.id === input.groupId)
  const targetIndex = input.orderedShots.findIndex((shot) => shot.id === input.targetShotId)
  const indexes = group ? groupIndexes(group, input.orderedShots) : null
  if (!group || group.kind !== input.kind || !indexes || targetIndex < 0) return { ok: false, reason: "找不到可调整的结构范围。" }
  const ids = input.orderedShots.map((shot) => shot.id)
  const nextStart = input.edge === "start" ? targetIndex : indexes.start
  const nextEnd = input.edge === "end" ? targetIndex : indexes.end
  if (nextStart > nextEnd) return { ok: false, reason: "结构至少需要一个正式镜头。" }
  const next = input.existingGroups.map((item) => item.id === group.id ? { ...item, shotIds: ids.slice(nextStart, nextEnd + 1), updatedAt: input.now ?? new Date().toISOString() } : item)
  return result(input.existingGroups, next, input.orderedShots)
}

export function mergeAdjacentStructures(input: StructureCommandContext & { kind: ShotGroupKind; leftGroupId: string; rightGroupId: string; discardRightContent?: boolean; metadataResolution?: "keep-left" | "keep-right" }): StructureCommandResult {
  const left = input.existingGroups.find((group) => group.id === input.leftGroupId)
  const right = input.existingGroups.find((group) => group.id === input.rightGroupId)
  const leftIndexes = left ? groupIndexes(left, input.orderedShots) : null
  const rightIndexes = right ? groupIndexes(right, input.orderedShots) : null
  if (!left || !right || left.id === right.id || left.kind !== input.kind || right.kind !== input.kind || !leftIndexes || !rightIndexes || leftIndexes.end + 1 !== rightIndexes.start) return { ok: false, reason: "只能合并时间相邻的同层结构。" }
  const metadataResolution = input.discardRightContent ? "keep-left" : input.metadataResolution
  if ((right.title.trim() || right.summary.trim()) && !metadataResolution) return { ok: false, reason: "合并将丢弃右侧结构内容，请先明确确认。" }
  const now = input.now ?? new Date().toISOString()
  const ids = input.orderedShots.map((shot) => shot.id)
  const next = input.existingGroups.filter((group) => group.id !== right.id).map((group) => group.id === left.id ? { ...group, ...(metadataResolution === "keep-right" ? { title: right.title, summary: right.summary } : {}), shotIds: ids.slice(leftIndexes.start, rightIndexes.end + 1), updatedAt: now } : group)
  const merged = result(input.existingGroups, next, input.orderedShots)
  if (merged.ok) merged.changes.idMap[right.id] = left.id
  return merged
}

export function deleteStructure(input: StructureCommandContext & { groupId: string }): StructureCommandResult {
  if (!input.existingGroups.some((group) => group.id === input.groupId)) return { ok: false, reason: "结构不存在或已被删除。" }
  return result(input.existingGroups, input.existingGroups.filter((group) => group.id !== input.groupId), input.orderedShots)
}

export function promoteStructureBoundary(input: StructureCommandContext & { groupId: string }): StructureCommandResult {
  const group = input.existingGroups.find((item) => item.id === input.groupId)
  if (!group || group.kind === "section") return { ok: false, reason: "该结构没有可提升的上一级边界。" }
  const kind: ShotGroupKind = group.kind === "scene" ? "sequence" : "section"
  return createStructureFromSelection({ ...input, kind, selectedShotIds: group.shotIds })
}

export function demoteStructureBoundary(input: StructureCommandContext & { groupId: string; metadataResolution?: "keep-left" | "keep-right"; discardRightContent?: boolean }): StructureCommandResult {
  const group = input.existingGroups.find((item) => item.id === input.groupId)
  if (!group || group.kind === "scene") return { ok: false, reason: "该结构没有可移除的上一级边界。" }
  const indexes = groupIndexes(group, input.orderedShots)
  if (!indexes) return { ok: false, reason: "该结构范围无效，无法移除上一级边界。" }
  const adjacent = input.existingGroups
    .filter((item) => item.kind === group.kind && item.id !== group.id)
    .map((item) => ({ group: item, indexes: groupIndexes(item, input.orderedShots) }))
    .filter((item): item is { group: ShotGroupRecord; indexes: { start: number; end: number } } => Boolean(item.indexes))
  const left = adjacent.find((item) => item.indexes.end + 1 === indexes.start)?.group
  const right = adjacent.find((item) => indexes.end + 1 === item.indexes.start)?.group
  if (left) return mergeAdjacentStructures({ ...input, kind: group.kind, leftGroupId: left.id, rightGroupId: group.id, metadataResolution: input.metadataResolution, discardRightContent: input.discardRightContent })
  if (right) return mergeAdjacentStructures({ ...input, kind: group.kind, leftGroupId: group.id, rightGroupId: right.id, metadataResolution: input.metadataResolution, discardRightContent: input.discardRightContent })
  return deleteStructure(input)
}
