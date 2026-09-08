import { ArrowRight, CircleDashed } from "lucide-react"
import { Button } from "../../../components/ui/button"
import type { WorkflowStage } from "../types.ts"

const COPY: Record<Exclude<WorkflowStage, "analyze">, { title: string; body: string; action: string }> = {
  prepare: {
    title: "准备工作区",
    body: "素材、研究模板和镜头地图将在这里集中管理。",
    action: "进入深拆",
  },
  calibrate: {
    title: "校准候选镜头",
    body: "这里将复核自动检测提出的候选区间；当前检测工具仍可从深拆中的原入口访问。",
    action: "返回深拆",
  },
  overview: {
    title: "总览正在接入",
    body: "Film Map 与结构视图会基于真实镜头和分组生成，不使用示例影片或虚假统计。",
    action: "进入深拆",
  },
  learn: {
    title: "学习正在接入",
    body: "学习页只会汇集你已经写下的笔记，并保留每条笔记的真实来源。",
    action: "进入深拆",
  },
  create: {
    title: "创作工具尚未开放",
    body: "Storyboard、拍摄镜头表、Prompt 与节奏模板将在依赖的数据模型完成后提供。",
    action: "返回深拆",
  },
}

interface WorkflowPlaceholderProps {
  stage: Exclude<WorkflowStage, "analyze">
  onGoToAnalyze: () => void
}

export default function WorkflowPlaceholder({ stage, onGoToAnalyze }: WorkflowPlaceholderProps) {
  const copy = COPY[stage]
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-xl border border-border bg-bg-panel p-8">
        <CircleDashed className="mb-5 size-7 text-text-muted" strokeWidth={1.5} />
        <h1 className="editor-page-title font-semibold text-text-base">{copy.title}</h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-text-muted">{copy.body}</p>
        <Button type="button" size="sm" onClick={onGoToAnalyze} className="mt-6 gap-2 bg-accent text-white hover:bg-accent/90">
          {copy.action}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </section>
  )
}
