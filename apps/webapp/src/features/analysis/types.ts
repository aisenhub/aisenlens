export type ResearchTarget =
  | { kind: "shot"; id: string }
  | { kind: "group"; id: string }
  | { kind: "range"; id: string }

export type ResearchStatus = "not-started" | "in-progress" | "completed"

export interface ResearchRange {
  id: string
  projectId: string
  mediaIdentityDigest: string
  startUs: number
  endUs: number
  title: string
  observation: string
  interpretation: string
  summary: string
  createdAt: string
  updatedAt: string
  revision: number
}

export type EvidenceRef =
  | { id: string; kind: "screenshot"; projectId: string; mediaIdentityDigest: string; screenshotId: string }
  | { id: string; kind: "shot"; projectId: string; mediaIdentityDigest: string; shotId: string }
  | { id: string; kind: "time-point"; mediaIdentityDigest: string; atUs: number }
  | { id: string; kind: "time-range"; mediaIdentityDigest: string; startUs: number; endUs: number }
  | { id: string; kind: "marker"; projectId: string; mediaIdentityDigest: string; markerId: string }
  | { id: string; kind: "audio-range"; projectId: string; mediaIdentityDigest: string; assetId: string; sourceStartUs: number; sourceEndUs: number; projectStartUs: number; projectEndUs: number }

export interface ResearchContext {
  id: string
  projectId: string
  target: ResearchTarget
  question: string
  status: ResearchStatus
  needsReview: boolean
  needsReviewReasons: string[]
  structureRevision: number
  evidence: EvidenceRef[]
  createdAt: string
  updatedAt: string
  revision: number
}

export function researchTargetKey(projectId: string, target: ResearchTarget): string {
  return `${projectId}:${target.kind}:${target.id}`
}

export function isValidResearchRange(range: Pick<ResearchRange, "startUs" | "endUs">): boolean {
  return Number.isSafeInteger(range.startUs) && Number.isSafeInteger(range.endUs)
    && range.startUs >= 0 && range.endUs > range.startUs
}

