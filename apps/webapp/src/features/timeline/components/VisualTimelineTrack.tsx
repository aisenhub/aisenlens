import { useMemo } from "react";
import FrameThumbnailStrip from "../../video/components/FrameThumbnailStrip";
import type { MediaSourceFingerprint } from "../../project/types";
import type { ShotData } from "../../editor/constants/editorData";
import TimelineTrack from "./TimelineTrack";
import { resolveShotLabel, type TimelineDetailLevel } from "../timelineSemantics";

interface VisualTimelineTrackProps {
  shots: ShotData[];
  activeShotIndex: number;
  currentTime: number;
  frameRate: number;
  durationSeconds: number;
  projectId: string;
  sourceUrl: string;
  mediaFingerprint: MediaSourceFingerprint | null;
  pixelsPerSecond: number;
  visibleStart: number;
  visibleEnd: number;
  playheadLeft: number;
  detail: TimelineDetailLevel;
  matchingShotIds: Set<string>;
  isFilteringShots: boolean;
  completionByShotId: Record<string, { missingRequired: number }>;
  onActiveShotChange: (index: number) => void;
  onCurrentTimeChange: (time: number) => void;
  onSeek: (event: React.MouseEvent<HTMLDivElement>) => void;
  timeToPx: (time: number) => number;
}

export default function VisualTimelineTrack({ shots, activeShotIndex, currentTime, frameRate, durationSeconds, projectId, sourceUrl, mediaFingerprint, pixelsPerSecond, visibleStart, visibleEnd, playheadLeft, detail, matchingShotIds, isFilteringShots, completionByShotId, onActiveShotChange, onCurrentTimeChange, onSeek, timeToPx }: VisualTimelineTrackProps) {
  const visibleShots = useMemo(() => shots.map((shot, index) => ({ shot, index })).filter(({ shot }) => shot.start + shot.duration >= Math.max(0, visibleStart - 2) && shot.start <= visibleEnd + 2), [shots, visibleEnd, visibleStart]);
  return <TimelineTrack className="cursor-pointer border-y border-black/60 bg-black" onSeek={onSeek} playheadLeft={playheadLeft}>
    {mediaFingerprint && sourceUrl && <FrameThumbnailStrip projectId={projectId} sourceUrl={sourceUrl} mediaFingerprint={mediaFingerprint} durationSeconds={durationSeconds} frameRate={frameRate} pixelsPerSecond={pixelsPerSecond} visibleStart={visibleStart} visibleEnd={visibleEnd} currentTime={currentTime} onSeek={onCurrentTimeChange} />}
    {visibleShots.map(({ shot, index }) => {
      const active = index === activeShotIndex;
      const atPlayhead = currentTime >= shot.start && currentTime < shot.start + shot.duration;
      const matched = matchingShotIds.has(shot.id);
      const incomplete = completionByShotId[shot.id]?.missingRequired > 0;
      const width = Math.max(1, timeToPx(shot.duration));
      const label = resolveShotLabel({ index, durationSeconds: shot.duration, pixelsPerSecond, detail, incomplete });
      return <div key={shot.id} className="absolute inset-y-0" style={{ left: timeToPx(shot.start), width }}>
        <button type="button" onClick={(event) => { event.stopPropagation(); onActiveShotChange(index); onCurrentTimeChange(shot.start); }} className={`absolute inset-0 flex items-center justify-center overflow-hidden border transition-colors ${isFilteringShots && !matched ? "border-transparent opacity-25" : active ? "z-10 border-accent bg-accent/20" : matched && isFilteringShots ? "border-accent/80 bg-accent/15" : atPlayhead ? "border-border-mid bg-white/10" : "border-border/40 bg-white/[0.03] hover:bg-white/[0.07]"}`} aria-label={`选择镜头 ${index + 1}`}>
          {label && <span className="flex min-w-0 items-center gap-1 truncate px-1 font-mono text-[8px] text-text-dim">{label}</span>}
        </button>
        {index > 0 && <button type="button" aria-label={`镜头 ${index} 与 ${index + 1} 的分界`} title="镜头分界 · 点击定位" onClick={(event) => { event.stopPropagation(); onActiveShotChange(index); onCurrentTimeChange(shot.start); }} className="absolute inset-y-0 left-0 z-20 w-1 -translate-x-1/2 cursor-ew-resize border-l border-accent/50 bg-accent/20 opacity-60 transition-opacity hover:w-1.5 hover:opacity-100" />}
      </div>;
    })}
  </TimelineTrack>;
}
