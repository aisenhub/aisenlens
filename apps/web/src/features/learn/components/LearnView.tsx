import { BookOpen } from "lucide-react"
import { Button } from "../../../components/ui/button"
import type { ShotData } from "../../editor/constants/editorData.ts"
import type { ShotGroupRecord } from "../../group/types"
import type { LearningSource } from "../services/deriveLearningSources"
import deriveLearningSources from "../services/deriveLearningSources"
import KnowledgeCapabilityState from "./KnowledgeCapabilityState"
import LearningSourceList from "./LearningSourceList"

interface LearnViewProps { shots: ShotData[]; groups: ShotGroupRecord[]; notes: Record<string, { content: string; analysis: string }>; onOpenSource: (source: LearningSource) => void; onGoToAnalyze: () => void; onGoToCreate: () => void }

export default function LearnView({ shots, groups, notes, onOpenSource, onGoToAnalyze, onGoToCreate }: LearnViewProps) {
  const sources = deriveLearningSources({ shots, groups, notes })
  const shotCount = sources.filter((source) => source.kind === "shot").length
  const groupCount = sources.filter((source) => source.kind === "group").length
  return <main className="min-h-0 flex-1 overflow-y-auto bg-bg px-4 py-5 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">Learn</p><h1 className="mt-1 text-xl font-semibold text-text-base">回看我的笔记</h1><p className="mt-2 text-sm text-text-muted">只聚合当前项目已有的 Shot 笔记与 Scene 摘要，不自动改写为技法。</p></div><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={onGoToAnalyze}>去 Analyze 记录</Button><Button type="button" size="sm" onClick={onGoToCreate} className="gap-2 bg-accent text-white hover:bg-accent/90"><BookOpen className="size-3.5" />未来创作</Button></div></div><div className="mb-5 flex gap-4 font-mono text-xs text-text-muted"><span>含笔记镜头 <b className="text-text-base">{shotCount}</b></span><span>含摘要场景 <b className="text-text-base">{groupCount}</b></span></div><div className="space-y-5"><LearningSourceList sources={sources} onOpenSource={onOpenSource} /><KnowledgeCapabilityState title="方法 / 技法库尚未开放" description="保存为技法、跨项目案例库与语义搜索需要独立的来源和备份模型。本阶段只提供真实笔记回看。" /></div></div></main>
}
