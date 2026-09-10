import type { AnalysisFieldCommand, AnalysisFieldCommandResult } from "../services/analysisFieldCommands.ts"
import { analysisEntriesEqual } from "../services/analysisFieldCommands.ts"
import type { EvidenceRef } from "../types.ts"
import type { AnalysisFieldEntry, ProjectAnalysisProfileSnapshot } from "../../template/types.ts"
import resolveAnalysisProfile, { getDefinition } from "../../template/services/resolveAnalysisProfile.ts"
import { validateAnalysisFieldEntry } from "../../template/services/templateValidation.ts"
import type { AICandidate } from "./types.ts"

export interface AICandidateContext {
  projectId: string
  mediaIdentityDigest: string
  profile: ProjectAnalysisProfileSnapshot
  shot: { id: string; startUs: number; endUs: number } | null
  currentEntry: AnalysisFieldEntry | undefined
}

export interface AICandidateEvaluation {
  valid: boolean
  stale: boolean
  conflict: boolean
  reasons: string[]
}

function sameEntry(left: AICandidate["baseEntry"], right: AICandidateContext["currentEntry"]): boolean {
  return left === null ? right === undefined : analysisEntriesEqual(left, right)
}

function validEvidence(evidence: EvidenceRef[], context: AICandidateContext): boolean {
  return evidence.every((item) => {
    if (item.mediaIdentityDigest !== context.mediaIdentityDigest) return false
    if ("projectId" in item && item.projectId !== context.projectId) return false
    if (item.kind === "time-point") return Number.isSafeInteger(item.atUs) && item.atUs >= 0
    if (item.kind === "time-range") return Number.isSafeInteger(item.startUs) && Number.isSafeInteger(item.endUs) && item.startUs >= 0 && item.endUs > item.startUs
    if (item.kind === "audio-range") return Number.isSafeInteger(item.sourceStartUs) && Number.isSafeInteger(item.sourceEndUs) && Number.isSafeInteger(item.projectStartUs) && Number.isSafeInteger(item.projectEndUs)
    return true
  })
}

export function evaluateAICandidate(candidate: AICandidate, context: AICandidateContext): AICandidateEvaluation {
  const reasons: string[] = []
  const definition = getDefinition(context.profile, candidate.fieldId)
  const usage = resolveAnalysisProfile(context.profile).fields.find((field) => field.definition.fieldId === candidate.fieldId)?.usage
  if (candidate.projectId !== context.projectId) reasons.push("候选不属于当前项目。")
  if (candidate.subject.kind !== "shot" || !context.shot || candidate.subject.id !== context.shot.id) reasons.push("目标镜头已不存在或已切换。")
  if (!context.shot || candidate.subject.startUs !== context.shot.startUs || candidate.subject.endUs !== context.shot.endUs) reasons.push("镜头边界已变化。")
  if (candidate.subject.mediaIdentityDigest !== context.mediaIdentityDigest) reasons.push("媒体身份已变化。")
  if (!Number.isSafeInteger(candidate.subject.startUs) || !Number.isSafeInteger(candidate.subject.endUs) || candidate.subject.startUs < 0 || candidate.subject.endUs <= candidate.subject.startUs) reasons.push("候选边界无效。")
  if (!definition || !usage) reasons.push("字段已移除或不再属于当前任务。")
  if (definition && definition.definitionVersion !== candidate.definitionVersion) reasons.push("字段定义版本已变化。")
  if (context.profile.version !== candidate.profileVersion) reasons.push("分析任务版本已变化，需要重新验证。")
  if (!sameEntry(candidate.baseEntry, context.currentEntry)) reasons.push("镜头当前值已被人工修改。")
  if (definition && validateAnalysisFieldEntry(definition, candidate.proposedEntry).length) reasons.push("候选值不符合当前字段定义。")
  if (!validEvidence(candidate.evidence, context)) reasons.push("候选证据与当前媒体或项目不一致。")
  if (candidate.confidence !== null && (!Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1)) reasons.push("confidence 必须为 null 或 0 到 1 之间的有限数字。")
  const staleReasons = new Set(["候选不属于当前项目。", "目标镜头已不存在或已切换。", "镜头边界已变化。", "媒体身份已变化。", "字段已移除或不再属于当前任务。", "字段定义版本已变化。", "分析任务版本已变化，需要重新验证。"])
  return { valid: reasons.length === 0, stale: reasons.some((reason) => staleReasons.has(reason)), conflict: reasons.includes("镜头当前值已被人工修改。"), reasons }
}

export interface AICandidateAcceptResult {
  status: "accepted" | "already-accepted" | "stale" | "conflict" | "invalid" | "rejected"
  applied: boolean
  reasons: string[]
}

export function acceptAICandidate(candidate: AICandidate, context: AICandidateContext, applyCommand: (command: AnalysisFieldCommand) => AnalysisFieldCommandResult): AICandidateAcceptResult {
  if (candidate.reviewStatus === "accepted") return { status: "already-accepted", applied: false, reasons: [] }
  if (candidate.reviewStatus === "rejected") return { status: "rejected", applied: false, reasons: ["候选已被拒绝。"] }
  const evaluation = evaluateAICandidate(candidate, context)
  if (!evaluation.valid) return { status: evaluation.conflict ? "conflict" : evaluation.stale ? "stale" : "invalid", applied: false, reasons: evaluation.reasons }
  const command: AnalysisFieldCommand = candidate.proposedEntry.state === "set"
    ? { kind: "set", fieldId: candidate.fieldId, value: candidate.proposedEntry.value }
    : candidate.proposedEntry.state === "unknown"
      ? { kind: "unknown", fieldId: candidate.fieldId }
      : { kind: "not_applicable", fieldId: candidate.fieldId }
  const result = applyCommand(command)
  if (result.error) return { status: "invalid", applied: false, reasons: [result.error] }
  return { status: "accepted", applied: result.changed, reasons: [] }
}
