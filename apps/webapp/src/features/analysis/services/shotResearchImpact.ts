import type { ResearchContext } from "../types.ts"
import type { ShotStructureChange } from "../../shot/services/shotStructureChanges.ts"

function withReview(context: ResearchContext, reason: string, now: string): ResearchContext {
  const reasons = context.needsReviewReasons.includes(reason)
    ? context.needsReviewReasons
    : [...context.needsReviewReasons, reason]
  return {
    ...structuredClone(context),
    needsReview: true,
    needsReviewReasons: reasons,
    structureRevision: context.structureRevision + 1,
    revision: context.revision + 1,
    updatedAt: now,
  }
}

export function applyShotChangeToResearchContexts(contexts: readonly ResearchContext[], change: ShotStructureChange, now: string): ResearchContext[] {
  return contexts.map((context) => {
    if (context.target.kind !== "shot") return structuredClone(context)
    if (change.kind === "split" && context.target.id === change.originalShotId) {
      return withReview(context, "镜头已分割，原研究目标仍指向前一段，请复核研究范围。", now)
    }
    if (change.kind === "merge" && context.target.id === change.removedShotId) {
      return withReview(context, "镜头已合并，原研究目标仍保留但需要复核。", now)
    }
    return structuredClone(context)
  })
}
