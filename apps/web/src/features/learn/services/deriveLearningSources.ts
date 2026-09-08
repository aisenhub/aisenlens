import type { ShotData } from "../../editor/constants/editorData.ts"
import type { ShotGroupRecord } from "../../group/types"

export interface LearningSource {
  id: string
  kind: "shot" | "group"
  title: string
  rangeLabel: string
  excerpt: string
  shotId: string | null
}

export interface LearningSourcesInput { shots: ShotData[]; groups: ShotGroupRecord[]; notes: Record<string, { content: string; analysis: string }> }

export default function deriveLearningSources({ shots, groups, notes }: LearningSourcesInput): LearningSource[] {
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
  return [...shotSources, ...groupSources]
}
