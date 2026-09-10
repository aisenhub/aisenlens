import { Textarea } from "../../../components/ui/textarea"
import InspectorSection from "./InspectorSection"
import type { ShotData } from "../../editor/constants/editorData.ts"
import type { EvidenceRef, ResearchContext, ResearchTarget } from "../types.ts"
import ResearchContextPanel from "./ResearchContextPanel"
import AnalysisFieldEntryInput from "./AnalysisFieldEntryInput"
import type { AnalysisFieldEntry, ResolvedAnalysisProfile } from "../../template/types"
import type { AnalysisFieldCommand } from "../services/analysisFieldCommands"

interface ShotInspectorProps {
  projectId: string
  shot: ShotData | null
  index: number
  notes: { content: string; analysis: string }
  profile: ResolvedAnalysisProfile | null
  entries: Record<string, AnalysisFieldEntry>
  context: ResearchContext | null
  target: ResearchTarget | null
  mediaIdentityDigest: string
  currentTime: number
  firstScreenshotId?: string | null
  lastScreenshotId?: string | null
  onChange: (patch: { content?: string; analysis?: string }) => void
  onAnalysisFieldCommand: (command: AnalysisFieldCommand) => void
  onEditingStart?: () => void
  onEditingEnd?: () => void
  onUpdateContext: (patch: Partial<Pick<ResearchContext, "question" | "status" | "needsReview">>) => Promise<void>
  onAddEvidence: (evidence: EvidenceRef) => void
  onRemoveEvidence: (evidenceId: string) => void
}

export default function ShotInspector({ projectId, shot, index, notes, profile, entries, context, target, mediaIdentityDigest, currentTime, firstScreenshotId, lastScreenshotId, onChange, onAnalysisFieldCommand, onEditingStart, onEditingEnd, onUpdateContext, onAddEvidence, onRemoveEvidence }: ShotInspectorProps) {
  if (!shot) return <aside className="flex w-full items-center justify-center border-l border-border p-6 text-center text-xs text-text-muted lg:w-80">选择一个镜头查看 Inspector。</aside>
  const fields = profile?.fields.filter((field) => field.definition.fieldId !== "shot_description" && field.surface.visible) ?? []
  return <aside className="w-full shrink-0 overflow-y-auto border-l border-border bg-bg-panel lg:w-80">
    <div className="border-b border-border px-4 py-3"><p className="font-mono text-xs text-accent">SHOT #{String(index + 1).padStart(2, "0")}</p><p className="mt-1 font-mono text-[10px] text-text-muted">{shot.start.toFixed(2)}–{(shot.start + shot.duration).toFixed(2)} s · {shot.type}</p></div>
    <InspectorSection title="Evidence"><p className="text-xs leading-5 text-text-muted">首尾帧和持久截图可以直接挂到当前研究上下文。</p></InspectorSection>
    <InspectorSection title="Facts"><p className="text-xs text-text-muted">画面描述 · 用户记录</p><Textarea value={notes.content} onChange={(event) => onChange({ content: event.target.value })} rows={4} placeholder="记录看到的画面内容…" className="mt-2 resize-none border-border bg-bg-input text-xs" />{profile && fields.length === 0 && <p className="mt-2 text-[11px] text-text-muted">当前模板未配置额外字段，可在设置中选择分析任务。</p>}</InspectorSection>
    {fields.length > 0 && <InspectorSection title="Analysis"><div className="space-y-2">{fields.map((field) => <AnalysisFieldEntryInput key={field.definition.fieldId} definition={field.definition} surface={field.surface} entry={entries[field.definition.fieldId]} onCommand={onAnalysisFieldCommand} onEditingStart={onEditingStart} onEditingEnd={onEditingEnd} issue={field.issues[0]} />)}</div></InspectorSection>}
    <InspectorSection title="Interpretation"><p className="text-xs text-text-muted">我的笔记</p><Textarea value={notes.analysis} onChange={(event) => onChange({ analysis: event.target.value })} rows={7} placeholder="记录镜头语言、导演意图、叙事功能…" className="mt-2 resize-none border-border bg-bg-input text-xs" /></InspectorSection>
    <InspectorSection title="Learning"><p className="text-xs leading-5 text-text-muted">当前笔记和研究证据会在学习阶段按真实来源汇集。</p></InspectorSection>
    <ResearchContextPanel projectId={projectId} target={target} context={context} mediaIdentityDigest={mediaIdentityDigest} currentTime={currentTime} currentShotId={shot.id} firstScreenshotId={firstScreenshotId} lastScreenshotId={lastScreenshotId} onUpdate={onUpdateContext} onAddEvidence={onAddEvidence} onRemoveEvidence={onRemoveEvidence} />
  </aside>
}
