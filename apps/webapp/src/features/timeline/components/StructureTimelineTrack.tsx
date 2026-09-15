import { useEffect, useMemo, useRef, useState } from "react";
import type { ShotData } from "../../editor/constants/editorData";
import type { ShotGroupKind, ShotGroupRecord } from "../../group/types";
import TimelineTrack from "./TimelineTrack";
import type { TimelineDetailLevel } from "../timelineSemantics";
import { moveStructureBoundary, resizeStructureEdge } from "../../group/services/structureCommands.ts";

interface StructureTimelineTrackProps {
  projectId: string;
  kind: ShotGroupKind;
  groups: ShotGroupRecord[];
  shots: ShotData[];
  selectedGroupId: string | null;
  visibleStart: number;
  visibleEnd: number;
  playheadLeft: number;
  detail: TimelineDetailLevel;
  onSeek: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSelectGroup: (id: string, firstIndex: number) => void;
  onDoubleClickGroup?: (group: ShotGroupRecord, start: number, end: number) => void;
  onDrillDownGroup?: (group: ShotGroupRecord) => void;
  onCreateAtBoundary?: (kind: ShotGroupKind, afterShotId: string) => void;
  onMoveBoundary?: (kind: ShotGroupKind, leftGroupId: string, rightGroupId: string, afterShotId: string) => void;
  onResizeEdge?: (kind: ShotGroupKind, groupId: string, edge: "start" | "end", targetShotId: string) => void;
  timeToPx: (time: number) => number;
  pxToTime: (pixels: number) => number;
}

type StructureDrag = {
  mode: "shared" | "edge";
  revision: string;
  rect: DOMRect;
  leftGroupId?: string;
  rightGroupId?: string;
  groupId?: string;
  edge?: "start" | "end";
};

function nearestCutShotId(shots: readonly ShotData[], time: number, startIndex: number, endIndex: number, edge: "start" | "end"): string | null {
  if (startIndex > endIndex || !shots.length) return null;
  const boundaryTime = (index: number) => {
    const shot = shots[index];
    return edge === "start" ? shot?.start ?? 0 : (shot?.start ?? 0) + (shot?.duration ?? 0);
  };
  let low = Math.max(0, startIndex);
  let high = Math.min(shots.length - 1, endIndex);
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (boundaryTime(middle) < time) low = middle + 1;
    else high = middle;
  }
  const candidates = [low - 1, low].filter((index) => index >= startIndex && index <= endIndex);
  const nearest = candidates.sort((left, right) => Math.abs(boundaryTime(left) - time) - Math.abs(boundaryTime(right) - time))[0];
  return nearest === undefined ? null : shots[nearest]?.id ?? null;
}

export default function StructureTimelineTrack({ projectId, kind, groups, shots, selectedGroupId, visibleStart, visibleEnd, playheadLeft, detail, onSeek, onSelectGroup, onDoubleClickGroup, onDrillDownGroup, onCreateAtBoundary, onMoveBoundary, onResizeEdge, timeToPx, pxToTime }: StructureTimelineTrackProps) {
  const [dragPreviewAfterShotId, setDragPreviewAfterShotId] = useState<string | null>(null);
  const dragPreviewRef = useRef<string | null>(null);
  const dragRef = useRef<StructureDrag | null>(null);
  const structureRevision = useMemo(() => `${shots.map((shot) => shot.id).join(",")}::${groups.map((group) => `${group.id}:${group.kind}:${group.shotIds.join(",")}`).join("|")}`, [groups, shots]);
  const shotIndexById = useMemo(() => new Map(shots.map((shot, index) => [shot.id, index])), [shots]);
  const allRanges = useMemo(() => groups.filter((group) => group.kind === kind).flatMap((group) => {
    const indexes = group.shotIds.map((id) => shotIndexById.get(id));
    if (!indexes.length || indexes.some((index) => index === undefined)) return [{ group, issue: "结构引用的镜头已不存在。", firstIndex: -1, start: 0, end: 0 }];
    const firstIndex = Math.min(...indexes as number[]);
    const lastIndex = Math.max(...indexes as number[]);
    const first = shots[firstIndex];
    const last = shots[lastIndex];
    if (!first || !last) return [{ group, issue: "结构范围无法定位。", firstIndex, start: 0, end: 0 }];
    return [{ group, issue: group.validity?.status === "needs-review" ? group.validity.reason ?? "结构需要复核。" : null, firstIndex, start: first.start, end: last.start + last.duration }];
  }), [groups, kind, shotIndexById, shots]);
  const ranges = useMemo(() => allRanges.filter((range) => range.issue || range.end >= Math.max(0, visibleStart - 2) && range.start <= visibleEnd + 2), [allRanges, visibleEnd, visibleStart]);
  const boundaryCuts = detail === "overview" ? [] : shots.map((shot, index) => ({ shot, index })).filter(({ shot, index }) => index < shots.length - 1 && shot.start >= Math.max(0, visibleStart - 1) && shot.start <= visibleEnd + 1);
  const sharedBoundaries = allRanges.flatMap((range) => {
    if (range.issue || range.firstIndex < 0 || !onMoveBoundary) return [];
    const next = allRanges.find((candidate) => candidate.firstIndex === range.firstIndex + range.group.shotIds.length);
    if (!next || next.firstIndex < 0) return [];
    const afterShot = shots[range.firstIndex + range.group.shotIds.length - 1];
    return afterShot && afterShot.start + afterShot.duration >= Math.max(0, visibleStart - 1) && afterShot.start <= visibleEnd + 1 ? [{ range, next, afterShot }] : [];
  });
  const edgeHandles = detail === "overview" ? [] : allRanges.flatMap((range) => {
    if (range.issue || range.firstIndex < 0 || !onResizeEdge) return [];
    const previous = allRanges.find((candidate) => candidate.firstIndex + candidate.group.shotIds.length === range.firstIndex);
    const next = allRanges.find((candidate) => candidate.firstIndex === range.firstIndex + range.group.shotIds.length);
    const firstShot = shots[range.firstIndex];
    const lastShot = shots[range.firstIndex + range.group.shotIds.length - 1];
    return [
      !previous && firstShot && firstShot.start >= Math.max(0, visibleStart - 1) && firstShot.start <= visibleEnd + 1 ? { range, edge: "start" as const, shot: firstShot } : null,
      !next && lastShot && lastShot.start + lastShot.duration >= Math.max(0, visibleStart - 1) && lastShot.start <= visibleEnd + 1 ? { range, edge: "end" as const, shot: lastShot } : null,
    ].filter((handle): handle is { range: typeof range; edge: "start" | "end"; shot: ShotData } => Boolean(handle));
  });
  useEffect(() => {
    if (!dragRef.current) return;
    const move = (event: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.revision !== structureRevision) {
        dragRef.current = null;
        dragPreviewRef.current = null;
        setDragPreviewAfterShotId(null);
        return;
      }
      const time = pxToTime(event.clientX - drag.rect.left);
      const current = drag.mode === "shared"
        ? allRanges.find((range) => range.group.id === drag.leftGroupId)
        : allRanges.find((range) => range.group.id === drag.groupId);
      if (!current || current.firstIndex < 0) return;
      const right = drag.rightGroupId ? allRanges.find((range) => range.group.id === drag.rightGroupId) : null;
      const targetShotId = drag.mode === "shared"
        ? right ? nearestCutShotId(shots, time, current.firstIndex, right.firstIndex - 1, "end") : null
        : drag.edge === "start"
          ? nearestCutShotId(shots, time, 0, current.firstIndex + current.group.shotIds.length - 1, "start")
          : nearestCutShotId(shots, time, current.firstIndex, shots.length - 1, "end");
      if (!targetShotId) return;
      const candidate = drag.mode === "shared"
        ? moveStructureBoundary({ projectId, kind, leftGroupId: drag.leftGroupId!, rightGroupId: drag.rightGroupId!, targetAfterShotId: targetShotId, orderedShots: shots.map((shot) => ({ id: shot.id })), existingGroups: groups, now: new Date().toISOString() })
        : resizeStructureEdge({ projectId, kind, groupId: drag.groupId!, edge: drag.edge!, targetShotId, orderedShots: shots.map((shot) => ({ id: shot.id })), existingGroups: groups, now: new Date().toISOString() });
      if (candidate.ok) { dragPreviewRef.current = targetShotId; setDragPreviewAfterShotId(targetShotId); }
      else { dragPreviewRef.current = null; setDragPreviewAfterShotId(null); }
    };
    const finish = () => {
      const drag = dragRef.current;
      const targetShotId = dragPreviewRef.current;
      if (drag && drag.revision === structureRevision && targetShotId) {
        if (drag.mode === "shared") onMoveBoundary?.(kind, drag.leftGroupId!, drag.rightGroupId!, targetShotId);
        else onResizeEdge?.(kind, drag.groupId!, drag.edge!, targetShotId);
      }
      dragRef.current = null;
      dragPreviewRef.current = null;
      setDragPreviewAfterShotId(null);
    };
    const cancel = (event: KeyboardEvent) => { if (event.key === "Escape") { dragRef.current = null; setDragPreviewAfterShotId(null); } };
    const cancelPointer = () => { dragRef.current = null; dragPreviewRef.current = null; setDragPreviewAfterShotId(null); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", finish, { once: true });
    window.addEventListener("keydown", cancel);
    window.addEventListener("pointercancel", cancelPointer);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", finish); window.removeEventListener("keydown", cancel); window.removeEventListener("pointercancel", cancelPointer); if (dragRef.current?.revision !== structureRevision) cancelPointer(); };
  }, [allRanges, groups, kind, onMoveBoundary, onResizeEdge, projectId, pxToTime, shots, structureRevision]);
  return <TimelineTrack className="border-b border-border/60 bg-bg-panel/45" style={{ contain: "layout paint" }} onSeek={onSeek} playheadLeft={playheadLeft}>
    {ranges.map(({ group, issue, firstIndex, start, end }) => <button key={group.id} type="button" disabled={firstIndex < 0} onClick={(event) => { event.stopPropagation(); if (firstIndex >= 0) onSelectGroup(group.id, firstIndex); }} onDoubleClick={(event) => { event.stopPropagation(); if (firstIndex >= 0) onDoubleClickGroup?.(group, start, end); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && firstIndex >= 0) { event.preventDefault(); event.stopPropagation(); onDrillDownGroup?.(group); } }} title={issue ?? `${group.title} · 双击缩放到范围`} className={`absolute inset-y-1 overflow-hidden rounded-sm border px-1 text-left transition-colors ${issue ? "border-amber-400/60 bg-amber-400/10" : selectedGroupId === group.id ? "border-accent/80 bg-accent/20" : "border-accent/25 bg-accent/7 hover:border-accent/55 hover:bg-accent/12"}`} style={{ left: issue ? 0 : timeToPx(start), width: issue ? Math.max(24, timeToPx(Math.max(0.1, end - start))) : Math.max(2, timeToPx(end - start)) }}>
      <span className="block truncate font-mono text-[8px] text-text-dim">{issue ? "需要复核" : `${group.title} · ${firstIndex + 1}–${firstIndex + group.shotIds.length}`}</span>
    </button>)}
    {onCreateAtBoundary && boundaryCuts.map(({ shot, index }) => <button key={shot.id} type="button" aria-label={`在镜头 ${index + 1} 后创建${kind === "scene" ? "场景" : kind === "sequence" ? "序列" : "段落"}边界`} title="在此镜头边界创建结构" onClick={(event) => { event.stopPropagation(); onCreateAtBoundary(kind, shot.id); }} className="group absolute inset-y-0 z-10 w-3 -translate-x-1/2 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100" style={{ left: timeToPx(shot.start + shot.duration) }}><span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-accent bg-bg-panel" /></button>)}
    {sharedBoundaries.map(({ range, next, afterShot }) => <button key={`${range.group.id}-${next.group.id}`} type="button" aria-label={`拖动${kind === "scene" ? "场景" : kind === "sequence" ? "序列" : "段落"}共享边界`} title="拖动共享边界；只在合法镜头切点提交" onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); dragRef.current = { mode: "shared", revision: structureRevision, leftGroupId: range.group.id, rightGroupId: next.group.id, rect: event.currentTarget.parentElement?.getBoundingClientRect() ?? new DOMRect() }; dragPreviewRef.current = afterShot.id; setDragPreviewAfterShotId(afterShot.id); }} className="absolute inset-y-0 z-30 w-2 -translate-x-1/2 cursor-ew-resize bg-accent/30 opacity-75 hover:w-2.5 hover:bg-accent" style={{ left: timeToPx(afterShot.start + afterShot.duration) }} />)}
    {edgeHandles.map(({ range, edge, shot }) => <button key={`${range.group.id}-${edge}`} type="button" aria-label={`拖动${kind === "scene" ? "场景" : kind === "sequence" ? "序列" : "段落"}${edge === "start" ? "起点" : "终点"}`} title="拖动结构端点；只在合法镜头切点提交" onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); dragRef.current = { mode: "edge", revision: structureRevision, groupId: range.group.id, edge, rect: event.currentTarget.parentElement?.getBoundingClientRect() ?? new DOMRect() }; dragPreviewRef.current = shot.id; setDragPreviewAfterShotId(shot.id); }} className="absolute inset-y-0 z-20 w-1 -translate-x-1/2 cursor-ew-resize bg-accent/45 opacity-70 hover:w-1.5 hover:bg-accent" style={{ left: timeToPx(edge === "start" ? shot.start : shot.start + shot.duration) }} />)}
    {dragPreviewAfterShotId && <div className="pointer-events-none absolute inset-y-0 z-40 w-px bg-amber-300" style={{ left: timeToPx((() => { const shot = shots.find((item) => item.id === dragPreviewAfterShotId); return dragRef.current?.mode === "edge" && dragRef.current.edge === "start" ? shot?.start ?? 0 : (shot?.start ?? 0) + (shot?.duration ?? 0); })()) }} />}
  </TimelineTrack>;
}
