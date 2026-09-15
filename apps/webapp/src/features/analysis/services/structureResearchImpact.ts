import type { StructureChangeSet } from "../../group/services/structureCommands.ts"
import type { ResearchContext } from "../types.ts"

const reasonFor = (change: StructureChangeSet, groupId: string): string | null => {
  if (change.removedGroupIds.includes(groupId)) {
    return change.idMap[groupId]
      ? "结构目标已合并到另一个结构，原研究仍保留，需复核。"
      : "结构目标已删除，原研究仍保留，需复核。"
  }
  if (change.rangeChangedGroupIds.includes(groupId)) return "结构范围已变化，原研究上下文需复核。"
  return null
}

function appendReason(reasons: string[], reason: string): string[] {
  return reasons.includes(reason) ? reasons : [...reasons, reason]
}

/**
 * Reconciles ResearchContext without touching persistence. The editor applies
 * the returned contexts together with the structure change in one snapshot.
 */
export function applyStructureChangeToResearchContexts(
  contexts: readonly ResearchContext[],
  change: StructureChangeSet,
  now: string,
): ResearchContext[] {
  if (!change.removedGroupIds.length && !change.rangeChangedGroupIds.length) return contexts.map((context) => structuredClone(context))
  return contexts.map((context) => {
    if (context.target.kind !== "group") return structuredClone(context)
    const reason = reasonFor(change, context.target.id)
    if (!reason) return structuredClone(context)
    return {
      ...structuredClone(context),
      needsReview: true,
      needsReviewReasons: appendReason(context.needsReviewReasons, reason),
      structureRevision: context.structureRevision + 1,
      revision: context.revision + 1,
      updatedAt: now,
    }
  })
}
