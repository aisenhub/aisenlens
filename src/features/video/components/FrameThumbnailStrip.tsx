import { useMemo } from "react";
import type { MediaSourceFingerprint } from "../../project/types";
import useFrameThumbnailQueue from "../hooks/useFrameThumbnailQueue";

const TILE_WIDTH = 80;
const BUFFER_VIEWPORTS = 1;

interface FrameThumbnailStripProps {
  projectId: string;
  sourceUrl: string;
  mediaFingerprint: MediaSourceFingerprint;
  durationSeconds: number;
  frameRate: number;
  pixelsPerSecond: number;
  visibleStart: number;
  visibleEnd: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

function frameSlots({ durationSeconds, frameRate, pixelsPerSecond, visibleStart, visibleEnd }: Pick<FrameThumbnailStripProps, "durationSeconds" | "frameRate" | "pixelsPerSecond" | "visibleStart" | "visibleEnd">): number[] {
  const slotSeconds = TILE_WIDTH / Math.max(1, pixelsPerSecond);
  const buffer = Math.max(slotSeconds, (visibleEnd - visibleStart) * BUFFER_VIEWPORTS);
  const start = Math.max(0, visibleStart - buffer);
  const end = Math.min(durationSeconds, visibleEnd + buffer);
  const firstSlot = Math.floor(start / slotSeconds);
  const lastSlot = Math.ceil(end / slotSeconds);
  const maximumFrame = Math.max(0, Math.floor(durationSeconds * frameRate) - 1);
  return [...new Set(Array.from({ length: Math.max(0, lastSlot - firstSlot + 1) }, (_, offset) => Math.min(maximumFrame, Math.round((firstSlot + offset + 0.5) * slotSeconds * frameRate))))];
}

export default function FrameThumbnailStrip(props: FrameThumbnailStripProps) {
  const { projectId, sourceUrl, mediaFingerprint, durationSeconds, frameRate, pixelsPerSecond, visibleStart, visibleEnd, currentTime, onSeek } = props;
  const requestedFrames = useMemo(() => frameSlots({ durationSeconds, frameRate, pixelsPerSecond, visibleStart, visibleEnd }), [durationSeconds, frameRate, pixelsPerSecond, visibleEnd, visibleStart]);
  const priorityFrames = useMemo(() => requestedFrames.filter((frame) => {
    const time = frame / frameRate;
    return time >= visibleStart && time <= visibleEnd;
  }).sort((left, right) => Math.abs(left / frameRate - currentTime) - Math.abs(right / frameRate - currentTime)), [currentTime, frameRate, requestedFrames, visibleEnd, visibleStart]);
  const thumbnails = useFrameThumbnailQueue({ projectId, sourceUrl, mediaFingerprint, durationSeconds, frameRate, frames: requestedFrames, priorityFrames });
  const thumbnailByFrame = useMemo(() => new Map(thumbnails.map((thumbnail) => [thumbnail.frame, thumbnail])), [thumbnails]);

  return <div className="absolute inset-0 overflow-hidden">
    {requestedFrames.map((frame) => {
      const centerTime = frame / frameRate;
      const thumbnail = thumbnailByFrame.get(frame);
      return <button key={frame} type="button" onClick={(event) => { event.stopPropagation(); onSeek(centerTime); }} title={`跳转至 ${centerTime.toFixed(2)} 秒`} className="group absolute bottom-0 top-0 overflow-hidden border-r border-black/40 bg-black" style={{ left: Math.max(0, centerTime * pixelsPerSecond - TILE_WIDTH / 2), width: TILE_WIDTH }}>
        {thumbnail ? <img src={thumbnail.url} alt="视频帧缩略图" className="h-full w-full object-cover opacity-60 transition-opacity group-hover:opacity-100" /> : <span className="block h-full w-full animate-pulse bg-white/5" />}
      </button>;
    })}
  </div>;
}
