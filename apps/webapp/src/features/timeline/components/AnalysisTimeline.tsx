import type { ReactNode } from "react"

interface AnalysisTimelineProps { children: ReactNode }

export default function AnalysisTimeline({ children }: AnalysisTimelineProps) {
  return <section className="min-h-24 border-t border-border bg-bg-panel">{children}</section>
}
