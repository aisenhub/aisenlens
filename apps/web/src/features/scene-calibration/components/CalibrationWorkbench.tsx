import { Check, Crosshair, Download, Flag, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../components/ui/tooltip";
import type { AutoShotCandidate } from "../../auto-shot/types";
import { candidateReviewStatus } from "../services/calibrationService";
import type { CalibrationAnnotationRecord, CalibrationHardCut, CalibrationUncertainRange } from "../types";

interface CalibrationWorkbenchProps {
  annotation: CalibrationAnnotationRecord;
  candidates: AutoShotCandidate[];
  onAcceptCandidate: (candidate: AutoShotCandidate) => void;
  onRejectCandidate: (candidateId: string) => void;
  onAddBoundary: () => void;
  onMoveBoundaryToPlayhead: (boundaryId: string) => void;
  onDeleteBoundary: (boundaryId: string) => void;
  onLocateBoundary: (timestampUs: number) => void;
  onMarkUncertain: () => void;
  onDeleteUncertainRange: (rangeId: string) => void;
  onAnnotatorChange?: (annotator: string) => void;
  onExport: () => void;
}

function formatTime(timestampUs: number): string {
  const seconds = timestampUs / 1_000_000;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
}

function IconAction({ label, children, onClick, variant = "ghost", pressed }: { label: string; children: React.ReactNode; onClick: () => void; variant?: "ghost" | "outline" | "default"; pressed?: boolean; }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button type="button" variant={variant} size="icon-xs" aria-label={label} aria-pressed={pressed} onClick={onClick} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function BoundaryRow({ boundary, onLocate, onMove, onDelete }: { boundary: CalibrationHardCut; onLocate: () => void; onMove: () => void; onDelete: () => void; }) {
  const sourceLabel = boundary.source === "candidate" ? "自动候选" : "人工补充";
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 rounded-lg border border-border/70 bg-bg-input/25 px-2 py-1.5">
      <div className="min-w-0">
        <p className="truncate font-mono text-[11px] text-text" title={formatTime(boundary.timestampUs)}>{formatTime(boundary.timestampUs)}</p>
        <p className="truncate text-[10px] text-text-dim" title={sourceLabel}>{sourceLabel} · 第 {boundary.frame} 帧</p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <IconAction label="定位此边界" onClick={onLocate}><Crosshair className="size-3" /></IconAction>
        <IconAction label="移动到当前播放头" onClick={onMove}><Pencil className="size-3" /></IconAction>
        <IconAction label="删除此边界" onClick={onDelete}><Trash2 className="size-3" /></IconAction>
      </div>
    </li>
  );
}

function UncertainRangeRow({ range, onLocate, onDelete }: { range: CalibrationUncertainRange; onLocate: () => void; onDelete: () => void; }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 rounded-lg border border-border/70 bg-amber-300/5 px-2 py-1.5">
      <div className="min-w-0">
        <p className="truncate font-mono text-[11px] text-text">{formatTime(range.startUs)} – {formatTime(range.endUs)}</p>
        <p className="truncate text-[10px] text-text-dim" title={range.reason}>{range.reason}</p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <IconAction label="定位此不确定区间" onClick={onLocate}><Crosshair className="size-3" /></IconAction>
        <IconAction label="删除此不确定区间" onClick={onDelete}><Trash2 className="size-3" /></IconAction>
      </div>
    </li>
  );
}

export default function CalibrationWorkbench({ annotation, candidates, onAcceptCandidate, onRejectCandidate, onAddBoundary, onMoveBoundaryToPlayhead, onDeleteBoundary, onLocateBoundary, onMarkUncertain, onDeleteUncertainRange, onExport, onAnnotatorChange }: CalibrationWorkbenchProps) {
  const reviewedCount = candidates.filter((candidate) => candidateReviewStatus(annotation, candidate.id)).length;
  const boundaries = [...annotation.hardCuts].sort((left, right) => left.timestampUs - right.timestampUs);

  return (
    <section className="min-w-0 space-y-3 rounded-2xl border border-border bg-bg-card p-3" aria-labelledby="calibration-workbench-title">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id="calibration-workbench-title" className="text-sm font-medium text-text">Hard-cut 标定</h2>
          <p className="mt-1 text-[10px] leading-4 text-text-dim">仅记录真值，不改动正式镜头或自动分镜任务。</p>
        </div>
        <span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-300/5 px-2 py-0.5 text-[10px] text-amber-200">{reviewedCount}/{candidates.length} 已判定</span>
      </div>

      {onAnnotatorChange && (
        <label className="block min-w-0">
          <span className="text-[10px] text-text-dim">标注者</span>
          <Input className="mt-1 h-7 text-xs" value={annotation.annotator === "未填写" ? "" : annotation.annotator} placeholder="姓名或团队" onChange={(event) => onAnnotatorChange(event.target.value)} />
        </label>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <Button type="button" variant="outline" size="sm" className="min-w-0 text-xs" onClick={onAddBoundary}><Plus className="size-3 shrink-0" />人工补充</Button>
        <Button type="button" variant="outline" size="sm" className="min-w-0 text-xs" onClick={onMarkUncertain}><Flag className="size-3 shrink-0" />标记不确定</Button>
        <Button type="button" variant="outline" size="sm" className="col-span-2 text-xs" onClick={onExport}><Download className="size-3" />导出标注数据</Button>
      </div>

      <div className="space-y-1.5 border-t border-border pt-2">
        <div className="flex items-center justify-between gap-2"><h3 className="text-[11px] font-medium text-text">自动候选</h3><span className="shrink-0 text-[10px] text-text-dim">待判定 {candidates.length - reviewedCount}</span></div>
        {candidates.length === 0 ? <p className="rounded-lg bg-bg-input/25 px-2 py-2 text-[10px] leading-4 text-text-dim">没有可复核的 hard-cut 候选。</p> : (
          <ul className="max-h-44 space-y-1 overflow-y-auto pr-0.5">
            {candidates.map((candidate) => {
              const status = candidateReviewStatus(annotation, candidate.id);
              const statusLabel = status === "accepted" ? "已接受" : status === "rejected" ? "已拒绝" : "待判定";
              return (
                <li key={candidate.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 rounded-lg border border-border/70 bg-bg-input/25 px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[11px] text-text" title={formatTime(candidate.boundary?.timestampUs ?? 0)}>{formatTime(candidate.boundary?.timestampUs ?? 0)}</p>
                    <p className="truncate text-[10px] text-text-dim">{statusLabel} · 候选 hard-cut</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <IconAction label="接受为 hard-cut 真值" variant={status === "accepted" ? "default" : "outline"} pressed={status === "accepted"} onClick={() => onAcceptCandidate(candidate)}><Check className="size-3" /></IconAction>
                    <IconAction label="拒绝为误检" variant={status === "rejected" ? "default" : "ghost"} pressed={status === "rejected"} onClick={() => onRejectCandidate(candidate.id)}><X className="size-3" /></IconAction>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-1.5 border-t border-border pt-2">
        <div className="flex items-center justify-between gap-2"><h3 className="text-[11px] font-medium text-text">Hard-cut 真值</h3><span className="shrink-0 text-[10px] text-text-dim">{boundaries.length} 条</span></div>
        {boundaries.length === 0 ? <p className="rounded-lg bg-bg-input/25 px-2 py-2 text-[10px] leading-4 text-text-dim">播放到边界后选择“人工补充”，用于记录漏检或位置修正。</p> : <ul className="max-h-40 space-y-1 overflow-y-auto pr-0.5">{boundaries.map((boundary) => <BoundaryRow key={boundary.id} boundary={boundary} onLocate={() => onLocateBoundary(boundary.timestampUs)} onMove={() => onMoveBoundaryToPlayhead(boundary.id)} onDelete={() => onDeleteBoundary(boundary.id)} />)}</ul>}
      </div>

      <div className="space-y-1.5 border-t border-border pt-2">
        <div className="flex items-center justify-between gap-2"><h3 className="text-[11px] font-medium text-text">不确定区间</h3><span className="shrink-0 text-[10px] text-text-dim">{annotation.uncertainRanges.length} 条</span></div>
        {annotation.uncertainRanges.length === 0 ? <p className="text-[10px] leading-4 text-text-dim">用于标记无法明确判断的片段；当前播放头起算 1 秒。</p> : <ul className="max-h-32 space-y-1 overflow-y-auto pr-0.5">{annotation.uncertainRanges.map((range) => <UncertainRangeRow key={range.id} range={range} onLocate={() => onLocateBoundary(range.startUs)} onDelete={() => onDeleteUncertainRange(range.id)} />)}</ul>}
      </div>

      <p className="text-[10px] leading-4 text-text-dim">导出文件不包含视频和本地绝对路径；导出前请确认素材来源、授权与隐私责任。</p>
    </section>
  );
}
