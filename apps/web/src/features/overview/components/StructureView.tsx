import { Info } from "lucide-react"
import ShotGroupPanel from "../../group/components/ShotGroupPanel"
import SceneBoard from "../../group/components/SceneBoard"
import type { ShotGroupKind, ShotGroupRecord } from "../../group/types"

interface StructureViewProps { groups: ShotGroupRecord[]; shotIndexById: Map<string, number>; onOpenScene: (group: ShotGroupRecord) => void; onStartSelection: () => void }

export default function StructureView({ groups, shotIndexById, onOpenScene, onStartSelection }: StructureViewProps) {
  return <div className="space-y-4"><div className="flex items-start gap-2 border border-border bg-bg-panel p-3 text-xs leading-5 text-text-muted"><Info className="mt-0.5 size-4 shrink-0 text-text-muted" /><span>结构是人工建立的 Film → Sequence / Section / Scene 视图。本版本不支持嵌套父子节点，也不会自动推断故事段落。</span></div><SceneBoard groups={groups} shotIndexById={shotIndexById} onOpenScene={onOpenScene} /><ShotGroupPanel isSelecting={false} selectedShotCount={0} kind={"scene" as ShotGroupKind} onKindChange={() => undefined} onStartSelection={onStartSelection} onCancelSelection={() => undefined} onCreate={() => undefined} /></div>
}
