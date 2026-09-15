import type { ShotGroupKind, ShotGroupRecord } from "../types"

export interface StructureValidationResult {
  valid: boolean
  reason: string | null
}

const structureRank: Record<ShotGroupKind, number> = {
  scene: 1,
  sequence: 2,
  section: 3,
}

function overlap(left: readonly string[], right: readonly string[]): boolean {
  const rightIds = new Set(right)
  return left.some((id) => rightIds.has(id))
}

function contains(container: readonly string[], child: readonly string[]): boolean {
  const ids = new Set(container)
  return child.every((id) => ids.has(id))
}

function validateShotMembership(shotIds: readonly string[], orderedShotIds?: readonly string[]): StructureValidationResult {
  if (shotIds.length === 0) return { valid: false, reason: "结构至少需要一个正式镜头。" }
  if (new Set(shotIds).size !== shotIds.length) return { valid: false, reason: "结构不能重复包含同一个正式镜头。" }
  if (!orderedShotIds) return { valid: true, reason: null }
  const ordered = new Set(orderedShotIds)
  if (shotIds.some((id) => !ordered.has(id))) return { valid: false, reason: "结构引用了不属于当前项目的正式镜头。" }
  const indexes = shotIds.map((id) => orderedShotIds.indexOf(id))
  if (indexes.some((index) => index < 0)) return { valid: false, reason: "结构包含无法定位的正式镜头。" }
  const sorted = [...indexes].sort((left, right) => left - right)
  if (sorted.some((index, position) => index !== sorted[0] + position)) {
    return { valid: false, reason: "结构中的正式镜头必须按影片顺序形成连续片段。" }
  }
  return { valid: true, reason: null }
}

function validateContainment(candidate: ShotGroupRecord, existing: ShotGroupRecord[]): StructureValidationResult {
  for (const other of existing) {
    if (other.id === candidate.id || !overlap(candidate.shotIds, other.shotIds)) continue
    if (candidate.kind === other.kind) return { valid: false, reason: `与同类结构“${other.title}”重叠。` }
    const higher = structureRank[candidate.kind] > structureRank[other.kind] ? candidate : other
    const lower = higher.id === candidate.id ? other : candidate
    if (!contains(higher.shotIds, lower.shotIds)) {
      const higherLabel = higher.kind === "section" ? "Section" : "Sequence"
      const lowerLabel = lower.kind === "scene" ? "Scene" : lower.kind === "sequence" ? "Sequence" : "Section"
      return { valid: false, reason: `${higherLabel} 必须完整包含 ${lowerLabel}“${lower.title}”，不能切穿其范围。` }
    }
  }
  return { valid: true, reason: null }
}

export function validateStructureMembership(input: {
  kind: ShotGroupKind
  shotIds: string[]
  existingGroups: ShotGroupRecord[]
  ignoreGroupId?: string
  orderedShotIds?: readonly string[]
}): StructureValidationResult {
  const members = validateShotMembership(input.shotIds, input.orderedShotIds)
  if (!members.valid) return members
  return validateContainment(
    {
      id: input.ignoreGroupId ?? "candidate",
      projectId: input.existingGroups[0]?.projectId ?? "",
      kind: input.kind,
      title: "当前结构",
      summary: "",
      shotIds: input.shotIds,
      createdAt: "",
      updatedAt: "",
    },
    input.existingGroups.filter((group) => group.id !== input.ignoreGroupId),
  )
}

export function validateStructureChange(
  group: ShotGroupRecord,
  existingGroups: ShotGroupRecord[],
  orderedShotIds?: readonly string[],
): StructureValidationResult {
  const membership = validateShotMembership(group.shotIds, orderedShotIds)
  if (!membership.valid) return membership
  return validateContainment(group, existingGroups.filter((item) => item.id !== group.id))
}

export function validateStructure(
  groups: ShotGroupRecord[],
  orderedShotIds?: readonly string[],
): StructureValidationResult {
  for (const group of groups) {
    const result = validateStructureChange(group, groups, orderedShotIds)
    if (!result.valid) return result
  }
  return { valid: true, reason: null }
}

export { structureRank }
