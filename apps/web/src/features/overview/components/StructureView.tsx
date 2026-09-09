import { useState } from "react"
import { Info } from "lucide-react"
import { Button } from "../../../components/ui/button"
import ShotGroupPanel from "../../group/components/ShotGroupPanel"
import SceneBoard from "../../group/components/SceneBoard"
import type { ShotGroupKind, ShotGroupRecord } from "../../group/types"

interface StructureViewProps { groups: ShotGroupRecord[]; shotIndexById: Map<string, number>; onOpenScene: (group: ShotGroupRecord) => void; onStartSelection: () => void }

export default function StructureView({ groups, shotIndexById, onOpenScene, onStartSelection }: StructureViewProps) {
  const [kind, setKind] = useState<ShotGroupKind>("scene")
  return <div className="space-y-4"><div className="flex items-start gap-2 border border-border bg-bg-panel p-3 text-xs leading-5 text-text-muted"><Info className="mt-0.5 size-4 shrink-0 text-text-muted" /><span>结构按 Scene / Sequence / Section 分层管理；同层不重叠，跨层覆盖由结构规则验证，不建立虚假的父子树。</span></div><div className="flex gap-1 border border-border p-1">{([['scene', 'Scene'], ['sequence', 'Sequence'], ['section', 'Section']] as const).map(([value, label]) => <Button key={value} type="button" variant="ghost" size="sm" onClick={() => setKind(value)} className={kind === value ? "bg-accent/15 text-accent" : "text-text-muted"}>{label} <span className="ml-1 font-mono text-[10px]">{groups.filter((group) => group.kind === value).length}</span></Button>)}</div><SceneBoard groups={groups} shotIndexById={shotIndexById} kind={kind} onOpenScene={onOpenScene} /><ShotGroupPanel isSelecting={false} selectedShotCount={0} kind={kind} onKindChange={setKind} onStartSelection={onStartSelection} onCancelSelection={() => undefined} onCreate={() => undefined} /></div>
}
