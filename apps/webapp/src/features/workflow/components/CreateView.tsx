import { ArrowLeft, LockKeyhole } from "lucide-react"
import { Button } from "../../../components/ui/button"

interface CreateViewProps { onBackToLearn: () => void }

export default function CreateView({ onBackToLearn }: CreateViewProps) {
  const items = ["Storyboard", "拍摄镜头表", "Prompt", "节奏模板"]
  return <main className="min-h-0 flex-1 overflow-y-auto bg-bg px-4 py-5 sm:px-6 lg:px-8"><div className="mx-auto max-w-3xl"><div className="mb-6"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">Create</p><h1 className="mt-1 text-xl font-semibold text-text-base">创作工具</h1><p className="mt-2 text-sm text-text-muted">这些入口目前只提供准确的状态说明，不会创建假任务或假结果。</p></div><div className="divide-y divide-border border border-border bg-bg-panel">{items.map((item) => <div key={item} className="flex items-center gap-3 px-4 py-4"><LockKeyhole className="size-4 text-text-muted" /><div className="flex-1"><p className="text-sm text-text-base">{item}</p><p className="mt-1 text-xs text-text-muted">Coming Soon · 依赖正式创作资产模型</p></div></div>)}</div><Button type="button" variant="outline" size="sm" onClick={onBackToLearn} className="mt-5 gap-2 border-border text-text-dim"><ArrowLeft className="size-3.5" />返回 Learn</Button></div></main>
}
