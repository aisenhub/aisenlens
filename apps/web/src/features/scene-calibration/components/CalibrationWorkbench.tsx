import { Check, Flag, Plus, X } from "lucide-react";
import { Button } from "../../../components/ui/button";
import type { AutoShotCandidate } from "../../auto-shot/types";
import type { CalibrationAnnotationRecord } from "../types";

interface CalibrationWorkbenchProps {
  annotation: CalibrationAnnotationRecord;
  candidates: AutoShotCandidate[];
  onAcceptCandidate: (candidate: AutoShotCandidate) => void;
  onRejectCandidate: (candidateId: string) => void;
  onAddBoundary: () => void;
  onMarkUncertain: () => void;
  onAnnotatorChange?: (annotator: string) => void;
  onExport: () => void;
}

export default function CalibrationWorkbench({ annotation, candidates, onAcceptCandidate, onRejectCandidate, onAddBoundary, onMarkUncertain, onExport, onAnnotatorChange }: CalibrationWorkbenchProps) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-bg-card p-3">
      <div className="flex items-center justify-between">
        <div><h2 className="text-sm font-medium text-text">人工质量标注</h2><p className="mt-1 text-[10px] text-text-dim">只记录 hard-cut 真值，不修改正式镜头；当前集合：{annotation.split}</p></div>
        <span className="rounded-full border border-amber-300/20 bg-amber-300/5 px-2 py-0.5 text-[10px] text-amber-200">Phase 12 · {annotation.reviewStatus === "reviewed" ? "已复核" : "待复核"}</span>
      </div>
      {onAnnotatorChange && <label className="block"><span className="text-[10px] text-text-dim">标注者</span><input className="mt-1 h-7 w-full rounded-lg border border-input bg-bg-input/30 px-2 text-xs text-text" value={annotation.annotator === "未填写" ? "" : annotation.annotator} placeholder="填写姓名或团队" onChange={(event) => onAnnotatorChange(event.target.value)} /></label>}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <Button type="button" variant="outline" size="sm" onClick={onAddBoundary}><Plus className="size-3" />新增边界</Button>
        <Button type="button" variant="outline" size="sm" onClick={onMarkUncertain}><Flag className="size-3" />标记不确定</Button>
        <Button type="button" variant="outline" size="sm" onClick={onExport}>导出标注</Button>
        <span className="flex items-center justify-center text-xs text-text-dim">{annotation.hardCuts.length} 个 hard-cut</span>
      </div>
      <div className="space-y-1 border-t border-border pt-2">
        {candidates.map((candidate) => {
          const accepted = annotation.hardCuts.some((cut) => cut.candidateId === candidate.id);
          return <div key={candidate.id} className="flex items-center justify-between rounded-lg bg-bg-input/30 px-2 py-1.5 text-xs"><span className="font-mono text-text-muted">{(candidate.boundary?.timestampUs ?? 0) / 1_000_000}s · {candidate.kind}</span><span className="flex gap-1"><Button type="button" variant={accepted ? "default" : "outline"} size="icon-xs" aria-label="接受候选" onClick={() => onAcceptCandidate(candidate)}><Check className="size-3" /></Button><Button type="button" variant="ghost" size="icon-xs" aria-label="拒绝候选" onClick={() => onRejectCandidate(candidate.id)}><X className="size-3" /></Button></span></div>;
        })}
      </div>
      <p className="text-[10px] leading-4 text-text-dim">导出文件不包含视频和本地绝对路径；请在导出前确认素材来源、授权和隐私责任。</p>
    </section>
  );
}
