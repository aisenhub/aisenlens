import type { ShotGroupKind, ShotGroupRecord } from "../types"

export interface StructureValidationResult {
  valid: boolean
  reason: string | null
}

function overlap(left: string[], right: string[]): boolean {
  const rightIds = new Set(right)
  return left.some((id) => rightIds.has(id))
}

function contains(container: string[], child: string[]): boolean {
  const ids = new Set(container)
  return child.every((id) => ids.has(id))
}

export function validateStructureMembership(input: {
  kind: ShotGroupKind
  shotIds: string[]
  existingGroups: ShotGroupRecord[]
  ignoreGroupId?: string
}): StructureValidationResult {
  if (!input.shotIds.length) return { valid: false, reason: "结构至少需要一个正式镜头。" }
  const existing = input.existingGroups.filter((group) => group.id !== input.ignoreGroupId)
  const sameKindOverlap = existing.find((group) => group.kind === input.kind && overlap(group.shotIds, input.shotIds))
  if (sameKindOverlap) return { valid: false, reason: `与同类结构“${sameKindOverlap.title}”重叠。` }

  if (input.kind === "sequence") {
    const partialScene = existing.find((group) => group.kind === "scene" && overlap(group.shotIds, input.shotIds) && !contains(input.shotIds, group.shotIds))
    if (partialScene) return { valid: false, reason: `Sequence 必须完整包含场景“${partialScene.title}”。` }
  }
  if (input.kind === "scene") {
    const partialSequence = existing.find((group) => group.kind === "sequence" && overlap(group.shotIds, input.shotIds) && !contains(group.shotIds, input.shotIds))
    if (partialSequence) return { valid: false, reason: `场景不能半跨 Sequence“${partialSequence.title}”。` }
  }
  return { valid: true, reason: null }
}

export function validateStructureChange(group: ShotGroupRecord, existingGroups: ShotGroupRecord[]): StructureValidationResult {
  return validateStructureMembership({ kind: group.kind, shotIds: group.shotIds, existingGroups, ignoreGroupId: group.id })
}

