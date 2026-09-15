import type { AutoShotCandidate } from "../types.ts"

export interface SuggestedBoundaryEvidence {
  type: "auto-shot-signal"
  label: string
  candidateId: string
  transitionKind: AutoShotCandidate["kind"]
  detectors: string[]
  rawScore: number
  threshold: number
  evidence: Record<string, number>
}

export interface SuggestedStructureBoundary {
  id: string
  runId: string
  mediaIdentityDigest: string
  structureRevision: number
  kind: "scene"
  afterShotId: string
  evidence: SuggestedBoundaryEvidence[]
}

interface FormalShotRange {
  id: string
  startFrame: number
  endFrame: number
}

interface SuggestionInput {
  runId: string
  mediaIdentityDigest: string
  structureRevision: number
  shots: readonly FormalShotRange[]
  candidates: readonly AutoShotCandidate[]
}

function stableId(runId: string, afterShotId: string, candidateId: string): string {
  let hash = 2_166_136_261
  for (const character of `${runId}|${afterShotId}|${candidateId}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619) >>> 0
  return `suggested-scene-${hash.toString(36)}`
}

/**
 * Research-only adapter for the verified AutoShot signal. It emits Scene
 * suggestions only when a real candidate ends at an existing formal shot
 * boundary. The engine score is retained as raw evidence and is deliberately
 * not exposed as probability or confidence.
 */
export function suggestSceneBoundaries(input: SuggestionInput): SuggestedStructureBoundary[] {
  const boundaryByEndFrame = new Map(input.shots.filter((shot) => Number.isSafeInteger(shot.endFrame) && shot.endFrame > shot.startFrame).map((shot) => [shot.endFrame, shot]))
  const finalFrame = input.shots.reduce((maximum, shot) => Math.max(maximum, shot.endFrame), 0)
  const suggestions = input.candidates
    .filter((candidate) => (candidate.kind === "hard-cut" || candidate.kind === "fade") && candidate.detectors.length > 0 && Number.isFinite(candidate.endFrame))
    .map((candidate) => ({ candidate, shot: boundaryByEndFrame.get(candidate.endFrame) }))
    .filter((item): item is { candidate: AutoShotCandidate; shot: FormalShotRange } => {
      const shot = item.shot
      return shot !== undefined && shot.endFrame < finalFrame
    })
    .sort((left, right) => left.shot.endFrame - right.shot.endFrame || left.candidate.id.localeCompare(right.candidate.id))
  const seen = new Set<string>()
  return suggestions.flatMap(({ candidate, shot }) => {
    const key = `${shot.id}|${candidate.id}`
    if (seen.has(key)) return []
    seen.add(key)
    return [{
      id: stableId(input.runId, shot.id, candidate.id),
      runId: input.runId,
      mediaIdentityDigest: input.mediaIdentityDigest,
      structureRevision: input.structureRevision,
      kind: "scene" as const,
      afterShotId: shot.id,
      evidence: [{
        type: "auto-shot-signal" as const,
        label: candidate.kind === "hard-cut" ? "检测到硬切信号" : "检测到淡入淡出信号",
        candidateId: candidate.id,
        transitionKind: candidate.kind,
        detectors: [...candidate.detectors],
        rawScore: candidate.score,
        threshold: candidate.threshold,
        evidence: { ...candidate.evidence },
      }],
    }]
  })
}

export function isSuggestedBoundaryStale(suggestion: Pick<SuggestedStructureBoundary, "mediaIdentityDigest" | "structureRevision">, current: Pick<SuggestionInput, "mediaIdentityDigest" | "structureRevision">): boolean {
  return suggestion.mediaIdentityDigest !== current.mediaIdentityDigest || suggestion.structureRevision !== current.structureRevision
}
