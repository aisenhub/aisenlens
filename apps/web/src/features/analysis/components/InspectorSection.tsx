import type { ReactNode } from "react"

interface InspectorSectionProps { title: string; children: ReactNode; action?: ReactNode }

export default function InspectorSection({ title, children, action }: InspectorSectionProps) {
  return <section className="border-b border-border px-4 py-4 last:border-b-0"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-mono text-[11px] tracking-wider text-text-muted">{title}</h3>{action}</div>{children}</section>
}
