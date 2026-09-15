export type TimelineTrackCategory = "structure" | "visual" | "annotation" | "analysis" | "media";
export type TimelineRenderMode = "point" | "range" | "segment" | "curve" | "waveform" | "frames" | "boundary";

export interface TimelineTrackDefinition {
  id: string;
  label: string;
  category: TimelineTrackCategory;
  layers: readonly TimelineRenderMode[];
  defaultVisible: boolean;
  defaultHeight: number;
  minHeight: number;
  maxHeight: number;
}

export const timelineTrackRegistry = [
  { id: "section", label: "段落", category: "structure", layers: ["range", "boundary"], defaultVisible: true, defaultHeight: 22, minHeight: 20, maxHeight: 80 },
  { id: "sequence", label: "序列", category: "structure", layers: ["range", "boundary"], defaultVisible: true, defaultHeight: 24, minHeight: 20, maxHeight: 80 },
  { id: "scene", label: "场景", category: "structure", layers: ["range", "boundary"], defaultVisible: true, defaultHeight: 28, minHeight: 20, maxHeight: 100 },
  { id: "visual", label: "视觉主轨", category: "visual", layers: ["frames", "range", "boundary"], defaultVisible: true, defaultHeight: 72, minHeight: 48, maxHeight: 160 },
  { id: "markers", label: "标记", category: "annotation", layers: ["point"], defaultVisible: true, defaultHeight: 28, minHeight: 20, maxHeight: 120 },
  { id: "primary-audio", label: "音频", category: "media", layers: ["waveform"], defaultVisible: true, defaultHeight: 48, minHeight: 28, maxHeight: 120 },
] as const satisfies readonly TimelineTrackDefinition[];

export const timelineTrackIds = ["section", "sequence", "scene", "visual", "markers", "primary-audio"] as const;
export type TimelineTrackId = (typeof timelineTrackIds)[number];
export const timelineTrackDefinitionById = Object.fromEntries(timelineTrackRegistry.map((track) => [track.id, track])) as Record<TimelineTrackId, (typeof timelineTrackRegistry)[number]>;
export const timelineStructureTrackIds = ["section", "sequence", "scene", "visual"] as const;

export function isTimelineTrackId(value: unknown): value is TimelineTrackId {
  return typeof value === "string" && timelineTrackRegistry.some((track) => track.id === value);
}
