import { FileOutput, TableProperties } from "lucide-react"

interface ResultsPlaceholderViewProps {
  view: "data" | "export"
}

export default function ResultsPlaceholderView({ view }: ResultsPlaceholderViewProps) {
  const isData = view === "data"
  const Icon = isData ? TableProperties : FileOutput
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center bg-bg px-6 py-10">
      <section className="w-full max-w-xl border border-border bg-bg-panel p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border-mid bg-bg-card text-accent">
            <Icon className="size-4" />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">Results / {isData ? "Data" : "Export"}</p>
            <h1 className="mt-1 text-lg font-semibold text-text-base">{isData ? "成果数据视图" : "Export Studio"}</h1>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {isData ? "ResultsDataset 与桌面级 Data Grid 将在 Phase 08 接入；当前只保留真实导航与能力边界。" : "正式导出工作台将在 Phase 08 接入；当前不会创建假预览、假进度或 no-op 导出。"}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
