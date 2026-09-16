import formatTimecode from "../../editor/utils/formatTimecode";
import type { MouseEvent } from "react";
import type { AnnotationMarker, AnnotationMarkerCategory } from "../../annotation/types";
import TimelineTrack from "./TimelineTrack";
import TimelinePlayheadHandle from "./TimelinePlayheadHandle";

interface TimelineRulerProps {
  contentWidth: number;
  pixelsPerSecond: number;
  visibleStart: number;
  visibleEnd: number;
  playheadLeft: number;
  onSeek: (event: MouseEvent<HTMLDivElement>) => void;
  isDraggingPlayhead: boolean;
  onPlayheadMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => void;
  markers: AnnotationMarker[];
  markerColors: Record<AnnotationMarkerCategory, string>;
  visibleMarkerCategories: AnnotationMarkerCategory[];
  selectedMarkerId: string | null;
  activeShotId: string | undefined;
  frameRate: number;
  onSelectMarker: (marker: AnnotationMarker) => void;
  viewRange: { inFrame: number | null; outFrame: number | null };
}

function getTickStep(pixelsPerSecond: number): { minor: number; label: number } {
  if (pixelsPerSecond >= 240) return { minor: 0.1, label: 1 };
  if (pixelsPerSecond >= 100) return { minor: 0.5, label: 2 };
  if (pixelsPerSecond >= 48) return { minor: 1, label: 5 };
  if (pixelsPerSecond >= 20) return { minor: 5, label: 10 };
  return { minor: 10, label: 30 };
}

export default function TimelineRuler({ contentWidth, pixelsPerSecond, visibleStart, visibleEnd, playheadLeft, onSeek, isDraggingPlayhead, onPlayheadMouseDown, markers, markerColors, visibleMarkerCategories, selectedMarkerId, activeShotId, frameRate, viewRange, onSelectMarker }: TimelineRulerProps) {
  const tick = getTickStep(pixelsPerSecond);
  const start = Math.max(0, Math.floor(visibleStart / tick.minor) * tick.minor);
  const end = Math.ceil(visibleEnd / tick.minor) * tick.minor;
  const marks: number[] = [];
  for (let time = start; time <= end + tick.minor / 2; time += tick.minor) marks.push(Math.round(time * 1_000) / 1_000);

 const inPointLeft = viewRange.inFrame === null ? null : viewRange.inFrame / frameRate * pixelsPerSecond;
 const outPointLeft = viewRange.outFrame === null ? null : (viewRange.outFrame + 1) / frameRate * pixelsPerSecond;
 return <TimelineTrack className="h-6 cursor-crosshair border-b border-border/60" onSeek={onSeek} playheadLeft={playheadLeft} playheadClassName="bg-accent/60"><div className="relative h-full" style={{ width: contentWidth }}>{inPointLeft !== null && outPointLeft !== null && outPointLeft > inPointLeft && <div className="absolute inset-y-0 bg-sky-400/10" style={{ left: inPointLeft, width: outPointLeft - inPointLeft }} />}{marks.map((time) => { const isLabel = Math.abs(time % tick.label) < 0.001; return <div key={time} className="absolute top-0 flex flex-col items-center" style={{ left: time * pixelsPerSecond }}><div className={`w-px ${isLabel ? "h-4 bg-border" : "h-2 bg-border/75"}`} />{isLabel && <span className="absolute top-3 whitespace-nowrap -translate-x-1/2 font-mono editor-micro text-text-muted">{formatTimecode(time)}</span>}</div>; })}{inPointLeft !== null && <span className="absolute top-0 z-20 -translate-x-1/2 bg-sky-400 px-1 font-mono text-[8px] leading-3 text-slate-950" style={{ left: inPointLeft }}>I</span>}{outPointLeft !== null && <span className="absolute top-0 z-20 -translate-x-1/2 bg-sky-400 px-1 font-mono text-[8px] leading-3 text-slate-950" style={{ left: outPointLeft }}>O</span>}{markers.filter((marker) => visibleMarkerCategories.includes(marker.category)).map((marker) => { const selected = marker.id === selectedMarkerId; const active = marker.shotId === activeShotId; return <button key={marker.id} type="button" title={`${marker.label}${marker.note ? ` · ${marker.note}` : ""}`} onClick={(event) => { event.stopPropagation(); onSelectMarker(marker); }} className={`absolute top-1 z-30 -translate-x-1/2 ${selected || active ? "h-4 w-3" : "h-3 w-2"}`} style={{ left: marker.frame / frameRate * pixelsPerSecond }}><span className={`mx-auto block h-full w-px ${selected || active ? "w-1" : "w-px"}`} style={{ backgroundColor: markerColors[marker.category] }} /><span className="mx-auto block size-1.5 -translate-y-px rotate-45" style={{ backgroundColor: markerColors[marker.category] }} /></button>; })}</div><TimelinePlayheadHandle left={playheadLeft} isDragging={isDraggingPlayhead} onMouseDown={onPlayheadMouseDown} /></TimelineTrack>;
}
