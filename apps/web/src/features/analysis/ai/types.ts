import type { AnalysisFieldEntry } from "../../template/types.ts"
import type { EvidenceRef } from "../types.ts"

export interface AICandidate {
  id: string
  projectId: string
  subject: { kind: "shot"; id: string; mediaIdentityDigest: string; startUs: number; endUs: number }
  fieldId: string
  definitionVersion: number
  profileVersion: number
  baseEntry: AnalysisFieldEntry | null
  proposedEntry: AnalysisFieldEntry
  reviewStatus: "pending" | "accepted" | "edited" | "rejected"
  confidence: number | null
  evidence: EvidenceRef[]
  source: { runId: string; recipeVersion: string; modelRef?: string }
}
