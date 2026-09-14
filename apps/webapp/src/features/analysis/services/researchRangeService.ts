import type { ShotData } from "../../editor/constants/editorData.ts"
import type { ResearchRange } from "../types.ts"
import { isValidResearchRange } from "../types.ts"

export interface ResearchRangeValidationInput {
  startUs: number
  endUs: number
  mediaDurationUs?: number | null
  mediaIdentityDigest?: string
  expectedMediaIdentityDigest?: string
}

export function validateResearchRange(input: ResearchRangeValidationInput): string | null {
  if (!isValidResearchRange(input)) return "研究范围必须是正向的整数微秒半开区间。"
  if (input.mediaDurationUs !== undefined && input.mediaDurationUs !== null && input.endUs > input.mediaDurationUs) return "研究范围不能超过媒体时长。"
  if (input.mediaIdentityDigest && input.expectedMediaIdentityDigest && input.mediaIdentityDigest !== input.expectedMediaIdentityDigest) return "研究范围对应的媒体已变化，请重新选择范围。"
  return null
}

export function projectShotsIntoResearchRange(shots: ShotData[], range: Pick<ResearchRange, "startUs" | "endUs">): string[] {
  return shots.filter((shot) => {
    const startUs = Math.round(shot.start * 1_000_000)
    const endUs = Math.round((shot.start + shot.duration) * 1_000_000)
    return startUs < range.endUs && endUs > range.startUs
  }).map((shot) => shot.id)
}
