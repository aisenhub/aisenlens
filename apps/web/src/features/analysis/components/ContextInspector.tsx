import ShotInspector from "./ShotInspector"
import SceneInspector from "./SceneInspector"
import type { ShotData } from "../../editor/constants/editorData.ts"
import type { ShotGroupRecord } from "../../group/types"

interface ContextInspectorProps { shot: ShotData | null; shotIndex: number; notes: { content: string; analysis: string }; group: ShotGroupRecord | null; onChangeNotes: (patch: { content?: string; analysis?: string }) => void }

export default function ContextInspector({ shot, shotIndex, notes, group, onChangeNotes }: ContextInspectorProps) {
  return <div className="flex min-h-0 flex-col">{group ? <SceneInspector group={group} /> : <ShotInspector shot={shot} index={shotIndex} notes={notes} onChange={onChangeNotes} />}</div>
}
