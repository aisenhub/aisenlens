import ShotInspector from "./ShotInspector"
import SceneInspector from "./SceneInspector"
import type { ShotData } from "../../editor/constants/editorData.ts"
import type { ShotGroupRecord } from "../../group/types"
import type { EvidenceRef, ResearchContext, ResearchTarget } from "../types.ts"

interface ContextInspectorProps { projectId: string; shot: ShotData | null; shotIndex: number; notes: { content: string; analysis: string }; group: ShotGroupRecord | null; targetKind?: "shot" | "group"; target: ResearchTarget | null; context: ResearchContext | null; mediaIdentityDigest: string; currentTime: number; firstScreenshotId?: string | null; lastScreenshotId?: string | null; onChangeNotes: (patch: { content?: string; analysis?: string }) => void; onUpdateContext: (patch: Partial<Pick<ResearchContext, "question" | "status" | "needsReview">>) => Promise<void>; onAddEvidence: (evidence: EvidenceRef) => void; onRemoveEvidence: (evidenceId: string) => void; className?: string }

export default function ContextInspector({ projectId, shot, shotIndex, notes, group, targetKind = "shot", target, context, mediaIdentityDigest, currentTime, firstScreenshotId, lastScreenshotId, onChangeNotes, onUpdateContext, onAddEvidence, onRemoveEvidence, className = "" }: ContextInspectorProps) {
  return <div className={`flex min-h-0 min-w-0 flex-col ${className}`}>{targetKind === "group" ? <SceneInspector projectId={projectId} group={group} context={context} target={target} mediaIdentityDigest={mediaIdentityDigest} currentTime={currentTime} onUpdateContext={onUpdateContext} onAddEvidence={onAddEvidence} onRemoveEvidence={onRemoveEvidence} /> : <ShotInspector projectId={projectId} shot={shot} index={shotIndex} notes={notes} context={context} target={target} mediaIdentityDigest={mediaIdentityDigest} currentTime={currentTime} firstScreenshotId={firstScreenshotId} lastScreenshotId={lastScreenshotId} onChange={onChangeNotes} onUpdateContext={onUpdateContext} onAddEvidence={onAddEvidence} onRemoveEvidence={onRemoveEvidence} />}</div>
}
