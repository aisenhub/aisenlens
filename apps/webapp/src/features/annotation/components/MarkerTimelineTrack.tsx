import { useMemo } from "react";
import type { AnnotationMarker } from "../types";
import TimelineTrack from "../../timeline/components/TimelineTrack";
import { clusterTimelinePoints, type TimelineDetailLevel } from "../../timeline/timelineSemantics";

interface MarkerTimelineTrackProps {
  markers: AnnotationMarker[];
  selectedMarkerId: string | null;
  frameRate: number;
  visibleStart: number;
  visibleEnd: number;
  pixelsPerSecond: number;
  playheadLeft: number;
  detail: TimelineDetailLevel;
  onSeek: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSelectMarker: (marker: AnnotationMarker) => void;
  timeToPx: (time: number) => number;
}

export default function MarkerTimelineTrack({ markers, selectedMarkerId, frameRate, visibleStart, visibleEnd, pixelsPerSecond, playheadLeft, detail, onSeek, onSelectMarker, timeToPx }: MarkerTimelineTrackProps) {
  const clusters = useMemo(() => clusterTimelinePoints(markers, frameRate, pixelsPerSecond, visibleStart, visibleEnd, detail === "frame-detail" ? { maxFrameDistance: 0 } : undefined), [detail, frameRate, markers, pixelsPerSecond, visibleEnd, visibleStart]);
  return <TimelineTrack className="cursor-crosshair border-b border-border/60 bg-bg-panel/35" onSeek={onSeek} playheadLeft={playheadLeft}>
    {!markers.length && <span className="absolute inset-0 flex items-center px-2 font-mono text-[9px] text-text-muted">尚无标记</span>}
    {clusters.map((cluster) => {
      const selected = cluster.items.some((marker) => marker.id === selectedMarkerId);
      const marker = cluster.items.find((item) => item.id === selectedMarkerId) ?? cluster.items[0];
      if (!marker) return null;
      const title = cluster.items.length > 1 ? `${cluster.items.length} 个标记：${cluster.items.map((item) => item.content).join(" · ")}` : marker.content;
      return <button key={cluster.key} type="button" title={title} aria-label={title} onClick={(event) => { event.stopPropagation(); onSelectMarker(marker); }} className={`absolute inset-y-1 z-10 -translate-x-1/2 ${selected ? "w-4" : "w-3"}`} style={{ left: timeToPx(cluster.frame / Math.max(1, frameRate)) }}>
        <span className={`mx-auto block h-full w-px ${selected ? "w-1 bg-accent" : "bg-accent/70"}`} />
        <span className={`absolute left-1/2 top-0 size-2 -translate-x-1/2 rotate-45 border ${selected ? "border-accent bg-accent" : "border-accent/70 bg-bg-panel"}`} />
        {cluster.items.length > 1 && <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[8px] font-semibold text-text-base">{cluster.items.length}</span>}
      </button>;
    })}
  </TimelineTrack>;
}
