import { Textarea } from "../../../components/ui/textarea"
import InspectorSection from "./InspectorSection"
import type { ShotData } from "../../editor/constants/editorData.ts"

interface ShotInspectorProps { shot: ShotData | null; index: number; notes: { content: string; analysis: string }; onChange: (patch: { content?: string; analysis?: string }) => void }

export default function ShotInspector({ shot, index, notes, onChange }: ShotInspectorProps) {
  if (!shot) return <aside className="flex w-full items-center justify-center border-l border-border p-6 text-center text-xs text-text-muted lg:w-80">选择一个镜头查看 Inspector。</aside>
  return <aside className="w-full shrink-0 overflow-y-auto border-l border-border bg-bg-panel lg:w-80"><div className="border-b border-border px-4 py-3"><p className="font-mono text-xs text-accent">SHOT #{String(index + 1).padStart(2, "0")}</p><p className="mt-1 font-mono text-[10px] text-text-muted">{shot.start.toFixed(2)}–{(shot.start + shot.duration).toFixed(2)} s · {shot.type}</p></div><InspectorSection title="Evidence"><p className="text-xs leading-5 text-text-muted">首尾帧和持久截图仍由原有深拆证据工具提供。当前 Inspector 不会创建新的截图记录。</p></InspectorSection><InspectorSection title="Facts"><p className="text-xs text-text-muted">画面描述 · 用户记录</p><Textarea value={notes.content} onChange={(event) => onChange({ content: event.target.value })} rows={4} placeholder="记录看到的画面内容…" className="mt-2 resize-none border-border bg-bg-input text-xs" /></InspectorSection><InspectorSection title="Interpretation"><p className="text-xs text-text-muted">我的笔记</p><Textarea value={notes.analysis} onChange={(event) => onChange({ analysis: event.target.value })} rows={7} placeholder="记录镜头语言、导演意图、叙事功能…" className="mt-2 resize-none border-border bg-bg-input text-xs" /></InspectorSection><InspectorSection title="Learning"><p className="text-xs leading-5 text-text-muted">保存为技法尚未开放。当前笔记会在学习阶段按真实来源汇集。</p></InspectorSection></aside>
}
