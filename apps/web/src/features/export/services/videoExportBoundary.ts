import type { VideoExportOverlaySegment } from "./videoExportProtocol";

export function selectVideoExportOverlaySegment(segments: VideoExportOverlaySegment[], frame: number): VideoExportOverlaySegment | null {
  return segments.find((segment) => frame >= segment.startFrame && frame < segment.endFrame) ?? null;
}
