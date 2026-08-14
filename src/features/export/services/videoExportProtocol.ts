import type { CompositionOverlaySettings } from "../../composition-overlay/types";
import type { ContentOverlayViewModel } from "../../content-overlay/services/contentOverlayResolver";
import type { ContentOverlaySettings } from "../../content-overlay/types";

export type VideoExportFormat = "mp4" | "webm";
export type VideoExportPhase = "preparing" | "mixing-audio" | "encoding-audio" | "encoding-video" | "finalizing";

export interface VideoExportSettings {
  format: VideoExportFormat;
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
  includeAudio: boolean;
  includeOriginalAudio: boolean;
  includeContentOverlay: boolean;
  includeCompositionOverlay: boolean;
}

export interface VideoExportOverlaySegment {
  startFrame: number;
  endFrame: number;
  contentOverlay: {
    settings: ContentOverlaySettings;
    model: ContentOverlayViewModel;
  } | null;
}

export interface VideoExportAudioData {
  channels: Float32Array[];
  sampleRate: number;
  length: number;
}

export interface VideoExportWriteChunk {
  type: "write";
  data: Uint8Array;
  position: number;
}

export interface VideoExportWorkerRequest {
  type: "start";
  source: Blob;
  title: string;
  settings: VideoExportSettings;
  durationFrames: number;
  overlaySegments: VideoExportOverlaySegment[];
  compositionOverlay: CompositionOverlaySettings | null;
  audio: VideoExportAudioData | null;
  streamed: boolean;
}

export type VideoExportWorkerMessage =
  | VideoExportWorkerRequest
  | { type: "cancel" }
  | { type: "stream-write-complete"; requestId: number }
  | { type: "stream-write-error"; requestId: number; message: string };

export type VideoExportWorkerResponse =
  | { type: "progress"; phase: VideoExportPhase; completedFrames: number; totalFrames: number }
  | { type: "stream-write"; requestId: number; chunk: VideoExportWriteChunk }
  | { type: "complete"; buffer: ArrayBuffer | null; mimeType: string; streamed: boolean }
  | { type: "cancelled" }
  | { type: "error"; message: string };
