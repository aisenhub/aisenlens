import { LockKeyhole } from "lucide-react"

interface KnowledgeCapabilityStateProps { title: string; description: string }

export default function KnowledgeCapabilityState({ title, description }: KnowledgeCapabilityStateProps) {
  return <section className="border border-border bg-bg-panel p-4"><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 size-4 shrink-0 text-text-muted" /><div><h2 className="text-sm font-medium text-text-base">{title}</h2><p className="mt-1 text-xs leading-5 text-text-muted">{description}</p></div></div></section>
}
