import type { ShotData } from "../../editor/constants/editorData.ts"
import type { ShotGroupRecord } from "../../group/types"
import type { ResearchContext, ResearchRange } from "../../analysis/types.ts"

export interface LearningSource {
  id: string
  kind: "shot" | "group" | "range"
  title: string
  rangeLabel: string
  excerpt: string
  shotId: string | null
}

export interface LearningSourcesInput { shots: ShotData[]; groups: ShotGroupRecord[]; notes: Record<string, { content: string; analysis: string }>; researchRanges?: ResearchRange[]; researchContexts?: ResearchContext[] }

export default function deriveLearningSources({ shots, groups, notes, researchRanges = [], researchContexts = [] }: LearningSourcesInput): LearningSource[] {
  const shotSources = shots.flatMap((shot, index) => {
    const note = notes[shot.id]
    const excerpt = note?.analysis?.trim() || note?.content?.trim() || ""
    if (!excerpt) return []
    return [{ id: shot.id, kind: "shot" as const, title: `镜头 #${String(index + 1).padStart(2, "0")}`, rangeLabel: `${shot.start.toFixed(2)}–${(shot.start + shot.duration).toFixed(2)} s`, excerpt, shotId: shot.id }]
  })
  const groupSources = groups.flatMap((group) => {
    const excerpt = group.summary.trim()
    if (!excerpt) return []
    return [{ id: group.id, kind: "group" as const, title: group.title, rangeLabel: `${group.shotIds.length} 个连续镜头`, excerpt, shotId: group.shotIds[0] ?? null }]
  })
  const rangeSources = researchRanges.flatMap((range) => {
    const context = researchContexts.find((item) => item.target.kind === "range" && item.target.id === range.id)
    const excerpt = range.summary.trim() || range.interpretation.trim() || range.observation.trim()
    if (!excerpt) return []
    return [{ id: range.id, kind: "range" as const, title: range.title || "研究范围", rangeLabel: `${(range.startUs / 1_000_000).toFixed(2)}–${(range.endUs / 1_000_000).toFixed(2)} s`, excerpt: context?.question ? `${context.question}\n${excerpt}` : excerpt, shotId: null }]
  })
  return [...shotSources, ...groupSources, ...rangeSources]
}
