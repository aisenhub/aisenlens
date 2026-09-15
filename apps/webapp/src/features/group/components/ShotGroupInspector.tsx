import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowLeftFromLine, ArrowLeftToLine, ArrowRightFromLine, ArrowRightToLine, ArrowUpToLine, Merge } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import type { AnnotationMarker } from "../../annotation/types";
import type { ShotGroupKind, ShotGroupRecord } from "../types";

interface ShotGroupInspectorProps {
  group: ShotGroupRecord | null;
  indexes: { first: number; last: number } | null;
  durationSeconds: number;
  onUpdate: (groupId: string, patch: Pick<ShotGroupRecord, "title" | "summary" | "kind">) => void;
  onAdjustRange: (groupId: string, edge: "start" | "end", operation: "extend" | "shrink") => void;
  markers?: AnnotationMarker[];
  startFrame?: number;
  endFrame?: number;
  frameRate?: number;
  onSelectMarker?: (marker: AnnotationMarker) => void;
  onSeek?: (frame: number) => void;
  adjacent?: { previous: ShotGroupRecord | null; next: ShotGroupRecord | null };
  onPromote?: (groupId: string) => void;
  onDemote?: (groupId: string) => void;
  onMerge?: (leftGroupId: string, rightGroupId: string, metadataResolution: "keep-left" | "keep-right") => void;
}

const groupKindLabels: Record<ShotGroupKind, string> = { scene: "场景", section: "段落", sequence: "序列" };

export default function ShotGroupInspector({ group, indexes, durationSeconds, onUpdate, onAdjustRange, markers = [], startFrame, endFrame, frameRate = 24, onSelectMarker, onSeek, adjacent, onPromote, onDemote, onMerge }: ShotGroupInspectorProps) {
  const [mergeTarget, setMergeTarget] = useState<"previous" | "next" | null>(null);
  useEffect(() => setMergeTarget(null), [group?.id]);
  if (!group || !indexes) return <div className="flex flex-1 items-center justify-center p-6 text-center editor-meta text-text-muted">从时间轴或分镜列表选择结构，即可查看和编辑结构信息。</div>;
  const rangeMarkers = startFrame === undefined || endFrame === undefined ? [] : markers.filter((marker) => marker.frame >= startFrame && marker.frame < endFrame).sort((left, right) => left.frame - right.frame);
  const mergeCandidate = mergeTarget && adjacent ? adjacent[mergeTarget] : null;
  const mergeLeft = mergeCandidate && mergeTarget === "previous" ? mergeCandidate : group;
  const mergeRight = mergeCandidate && mergeTarget === "previous" ? group : mergeCandidate;
  const mergeHasRightContent = Boolean(mergeRight?.title.trim() || mergeRight?.summary.trim());
  return <div className="flex-1 overflow-y-auto p-4"><div className="space-y-4">
    <div><p className="mb-2 font-mono editor-heading tracking-wider text-text-muted">结构名称</p><Input value={group.title} onChange={(event) => onUpdate(group.id, { title: event.target.value, kind: group.kind, summary: group.summary })} className="h-7 border-border bg-bg-input px-2 editor-body" /></div>
    <div><p className="mb-2 font-mono editor-heading tracking-wider text-text-muted">结构层级</p><p className="h-7 rounded-md border border-border bg-bg-input px-2 py-1.5 editor-body text-text-dim">{groupKindLabels[group.kind]}</p><p className="mt-1 editor-meta text-text-muted">层级通过 Boundary / Promote / Demote 调整，避免直接改写结构身份。</p></div>
    <div className="rounded-xl border border-border bg-bg-deep p-3"><div className="flex items-center justify-between"><p className="font-mono editor-heading tracking-wider text-text-muted">结构范围</p><span className="editor-meta text-text-dim">#{String(indexes.first + 1).padStart(2, "0")} – #{String(indexes.last + 1).padStart(2, "0")}</span></div><p className="mt-1 editor-meta text-text-muted">连续 {group.shotIds.length} 镜 · {durationSeconds.toFixed(2)} 秒</p><div className="mt-3 grid grid-cols-2 gap-1.5"><Button type="button" variant="outline" size="sm" onClick={() => onAdjustRange(group.id, "start", "extend")} className="h-7 px-1 editor-body font-normal"><ArrowLeftFromLine className="size-3" />起点向前</Button><Button type="button" variant="outline" size="sm" onClick={() => onAdjustRange(group.id, "end", "extend")} className="h-7 px-1 editor-body font-normal"><ArrowRightFromLine className="size-3" />终点向后</Button><Button type="button" variant="outline" size="sm" onClick={() => onAdjustRange(group.id, "start", "shrink")} className="h-7 px-1 editor-body font-normal"><ArrowRightToLine className="size-3" />起点向后</Button><Button type="button" variant="outline" size="sm" onClick={() => onAdjustRange(group.id, "end", "shrink")} className="h-7 px-1 editor-body font-normal"><ArrowLeftToLine className="size-3" />终点向前</Button></div></div>
     <div className="rounded-xl border border-border bg-bg-deep p-3"><p className="font-mono editor-heading tracking-wider text-text-muted">结构命令</p><div className="mt-2 grid grid-cols-2 gap-1.5">{group.kind !== "section" && <Button type="button" variant="outline" size="sm" onClick={() => onPromote?.(group.id)} className="h-7 px-1 editor-body font-normal"><ArrowUpToLine className="size-3" />提升边界</Button>}{group.kind !== "scene" && <Button type="button" variant="outline" size="sm" onClick={() => onDemote?.(group.id)} className="h-7 px-1 editor-body font-normal"><ArrowDownToLine className="size-3" />移除上级边界</Button>}{adjacent?.previous && <Button type="button" variant="outline" size="sm" onClick={() => setMergeTarget("previous")} className="h-7 px-1 editor-body font-normal"><Merge className="size-3" />合并前一结构</Button>}{adjacent?.next && <Button type="button" variant="outline" size="sm" onClick={() => setMergeTarget("next")} className="h-7 px-1 editor-body font-normal"><Merge className="size-3" />合并后一结构</Button>}</div>{mergeCandidate && mergeLeft && mergeRight && <div className="mt-3 rounded-md border border-amber-300/30 bg-amber-300/5 p-2.5 text-xs text-text-dim"><p className="font-medium text-amber-200">合并预览</p><p className="mt-1 leading-5">左侧：{mergeLeft.title || "（空标题）"}<br />右侧：{mergeRight.title || "（空标题）"}{mergeRight.summary ? <><br />右侧摘要：{mergeRight.summary}</> : null}</p><p className="mt-2 text-[11px] text-text-muted">合并后保留左侧 ID；右侧研究上下文仍会保留为待复核记录。</p><div className="mt-2 flex flex-wrap gap-1.5"><Button type="button" size="xs" onClick={() => { onMerge?.(mergeLeft.id, mergeRight.id, "keep-left"); setMergeTarget(null) }} className="h-7 editor-body font-normal">保留左侧内容</Button>{mergeHasRightContent && <Button type="button" variant="outline" size="xs" onClick={() => { onMerge?.(mergeLeft.id, mergeRight.id, "keep-right"); setMergeTarget(null) }} className="h-7 editor-body font-normal">保留右侧内容</Button>}<Button type="button" variant="ghost" size="xs" onClick={() => setMergeTarget(null)} className="h-7 editor-body font-normal text-text-muted">取消</Button></div></div>}</div>
     <div><p className="mb-2 font-mono editor-heading tracking-wider text-text-muted">结构分析</p><Textarea value={group.summary} onChange={(event) => onUpdate(group.id, { title: group.title, kind: group.kind, summary: event.target.value })} rows={7} placeholder="记录该结构的叙事功能、情绪和剪辑特点…" className="min-h-0 resize-none border-border bg-bg-input p-3 editor-body text-text-dim placeholder:text-text-muted" /></div>
    <div className="border-t border-border pt-3"><div className="flex items-center justify-between"><p className="font-mono editor-heading tracking-wider text-text-muted">范围内标记</p><span className="font-mono editor-micro text-text-muted">{rangeMarkers.length}</span></div>{rangeMarkers.length ? <div className="mt-2 space-y-1">{rangeMarkers.map((marker) => <button key={marker.id} type="button" onClick={() => { onSelectMarker?.(marker); onSeek?.(marker.frame); }} className="flex w-full items-start gap-2 rounded-md border border-border bg-bg-input/30 px-2 py-1.5 text-left hover:border-accent/40"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" /><span className="min-w-0"><span className="block font-mono text-[10px] text-text-muted">{formatMarkerFrame(marker.frame, frameRate)}</span><span className="block truncate text-xs text-text-dim">{marker.content}</span></span></button>)}</div> : <p className="mt-2 editor-meta text-text-muted">该范围暂无标记。</p>}</div>
  </div></div>;
}

function formatMarkerFrame(frame: number, frameRate: number): string {
  const safeRate = Math.max(1, frameRate);
  const seconds = Math.floor(frame / safeRate);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}:${String(frame % Math.round(safeRate)).padStart(2, "0")}`;
}
