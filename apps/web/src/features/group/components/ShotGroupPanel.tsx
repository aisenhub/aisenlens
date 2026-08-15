import { FolderPlus } from "lucide-react";
import { Button } from "../../../components/ui/button";
import type { ShotGroupKind } from "../types";

interface ShotGroupPanelProps {
  isSelecting: boolean;
  selectedShotCount: number;
  kind: ShotGroupKind;
  onKindChange: (kind: ShotGroupKind) => void;
  onStartSelection: () => void;
  onCancelSelection: () => void;
  onCreate: () => void;
}

export default function ShotGroupPanel({ isSelecting, selectedShotCount, kind, onKindChange, onStartSelection, onCancelSelection, onCreate }: ShotGroupPanelProps) {
  const canCreate = selectedShotCount >= 2;
  return <section className="mt-4 border-t border-border pt-3">
    <p className="font-mono editor-heading tracking-wider text-text-muted">镜头分组</p>
    <div className="mt-3 rounded-xl border border-border bg-bg-deep p-2.5">
      <div>
        <p className="editor-meta text-text-muted">分组类别</p>
        <div className="mt-1 grid grid-cols-3 gap-1">
          {([['scene', '场景'], ['section', '段落'], ['sequence', '序列']] as [ShotGroupKind, string][]).map(([option, label]) => <Button key={option} type="button" variant="outline" size="sm" disabled={isSelecting} aria-pressed={kind === option} onClick={() => onKindChange(option)} className={`h-7 px-1 editor-body font-normal disabled:opacity-60 ${kind === option ? "border-accent/50 bg-accent/15 text-accent hover:bg-accent/20 hover:text-accent" : "border-border text-text-dim hover:bg-white/4 hover:text-white"}`}>{label}</Button>)}
        </div>
      </div>
      {isSelecting ? <><p className="mt-2 editor-meta text-text-muted">已选 {selectedShotCount} 个连续镜头</p><div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-1"><Button type="button" variant="ghost" size="xs" onClick={onCancelSelection} className="shrink-0 editor-body font-normal text-text-muted">取消</Button><Button type="button" size="xs" disabled={!canCreate} onClick={onCreate} className="min-w-0 px-1.5 editor-body font-normal"><FolderPlus className="shrink-0" />确认（{selectedShotCount}）</Button></div></> : <Button type="button" variant="outline" size="sm" onClick={onStartSelection} className="mt-2 h-7 w-full editor-body font-normal border-accent/30 text-accent hover:bg-accent/10"><FolderPlus />选择镜头创建分组</Button>}
    </div>
  </section>;
}
