import type { ShotData } from "../../editor/constants/editorData.ts"
import type { AnalysisFieldValue } from "../../template/types"
import type { ShotDetectionMeta } from "../../shot/types"

export interface ShotInspectorViewModel {
  id: string
  index: number
  rangeLabel: string
  durationSeconds: number
  description: string
  interpretation: string
  fields: Record<string, AnalysisFieldValue>
  detection: ShotDetectionMeta | null
  sourceLabels: string[]
}

export function createShotInspectorViewModel(input: { shot: ShotData; index: number; frameRate: number; frames?: { first: number; last: number }; notes?: { content: string; analysis: string }; fields?: Record<string, AnalysisFieldValue>; detection?: ShotDetectionMeta | null }): ShotInspectorViewModel {
  const { shot, index, frameRate, frames, notes, fields, detection = null } = input
  const startFrame = frames?.first ?? Math.round(shot.start * frameRate)
  const endFrame = frames?.last ?? Math.max(startFrame, Math.round((shot.start + shot.duration) * frameRate) - 1)
  return {
    id: shot.id,
    index,
    rangeLabel: `帧 ${startFrame}–${endFrame}`,
    durationSeconds: Math.max(0, (endFrame - startFrame + 1) / frameRate),
    description: notes?.content ?? "",
    interpretation: notes?.analysis ?? "",
    fields: fields ?? {},
    detection,
    sourceLabels: detection ? ["检测来源", detection.source] : ["用户记录"],
  }
}

export default createShotInspectorViewModel
