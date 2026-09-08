import InspectorSection from "./InspectorSection"
import type { ShotGroupRecord } from "../../group/types"

interface SceneInspectorProps { group: ShotGroupRecord | null }

export default function SceneInspector({ group }: SceneInspectorProps) {
  if (!group) return <aside className="border-l border-border p-5 text-xs text-text-muted">选择一个场景查看摘要和成员范围。</aside>
  return <aside className="border-l border-border bg-bg-panel p-4"><InspectorSection title="Scene"><h2 className="text-sm text-text-base">{group.title}</h2><p className="mt-2 font-mono text-xs text-text-muted">{group.shotIds.length} 个连续镜头</p></InspectorSection><InspectorSection title="Summary"><p className="whitespace-pre-wrap text-xs leading-5 text-text-muted">{group.summary || "尚未记录场景摘要。"}</p></InspectorSection></aside>
}
