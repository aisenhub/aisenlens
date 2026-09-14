import InspectorSection from "./InspectorSection"
import type { ShotGroupRecord } from "../../group/types"
import type { EvidenceRef, ResearchContext, ResearchTarget } from "../types.ts"
import ResearchContextPanel from "./ResearchContextPanel"

interface SceneInspectorProps { projectId: string; group: ShotGroupRecord | null; context: ResearchContext | null; target: ResearchTarget | null; mediaIdentityDigest: string; currentTime: number; onUpdateContext: (patch: Partial<Pick<ResearchContext, "question" | "status" | "needsReview">>) => Promise<void>; onAddEvidence: (evidence: EvidenceRef) => void; onRemoveEvidence: (evidenceId: string) => void }

export default function SceneInspector({ projectId, group, context, target, mediaIdentityDigest, currentTime, onUpdateContext, onAddEvidence, onRemoveEvidence }: SceneInspectorProps) {
  if (!group) return <aside className="border-l border-border p-5 text-xs text-text-muted">选择一个场景查看摘要和成员范围。</aside>
  return <aside className="border-l border-border bg-bg-panel"><div className="p-4"><InspectorSection title="Scene"><h2 className="text-sm text-text-base">{group.title}</h2><p className="mt-2 font-mono text-xs text-text-muted">{group.shotIds.length} 个连续镜头</p></InspectorSection><InspectorSection title="Summary"><p className="whitespace-pre-wrap text-xs leading-5 text-text-muted">{group.summary || "尚未记录场景摘要。"}</p></InspectorSection></div><ResearchContextPanel projectId={projectId} target={target} context={context} mediaIdentityDigest={mediaIdentityDigest} currentTime={currentTime} onUpdate={onUpdateContext} onAddEvidence={onAddEvidence} onRemoveEvidence={onRemoveEvidence} /></aside>
}
