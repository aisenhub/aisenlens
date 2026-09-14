import projectRepository from "../../project/services/projectRepository";
import type { DerivedFrameThumbnail, MediaSourceFingerprint } from "../../project/types";

export interface FrameThumbnailResource {
  frame: number;
  url: string;
}

interface FrameThumbnailDecoderInput {
  projectId: string;
  sourceUrl: string;
  mediaFingerprint: MediaSourceFingerprint;
  durationSeconds: number;
  frameRate: number;
  presentationTimestamps?: readonly number[];
  presentationDurations?: readonly number[];
}

export interface FrameThumbnailDecoder {
  capture: (frame: number, shouldContinue: () => boolean) => Promise<FrameThumbnailResource>;
  dispose: () => void;
}

const THUMBNAIL_WIDTH = 192;

export interface DecodeVideoFrameCanvasInput {
  sourceUrl: string;
  frame: number;
  frameRate: number;
  durationSeconds: number;
  presentationTimestamps?: readonly number[];
  presentationDurations?: readonly number[];
}

function frameTimestamp(frame: number, frameRate: number, durationSeconds: number, presentationTimestamps?: readonly number[]): number {
  if (presentationTimestamps?.[frame] !== undefined) return presentationTimestamps[frame]!;
  return Math.min(Math.max(0, frame / frameRate), Math.max(0, durationSeconds - 0.001));
}

async function canvasToJpeg(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<Blob> {
  if (canvas instanceof HTMLCanvasElement) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("无法编码视频缩略图。")), "image/jpeg", 0.72));
  }
  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.72 });
}

export async function loadCachedFrameThumbnail(projectId: string, mediaFingerprint: MediaSourceFingerprint, frame: number): Promise<FrameThumbnailResource | null> {
  const cached = await projectRepository.getDerivedFrameThumbnail(projectId, mediaFingerprint, frame);
  return cached ? { frame, url: URL.createObjectURL(cached.blob) } : null;
}

export async function decodeVideoFrameCanvas({ sourceUrl, frame, frameRate, durationSeconds, presentationTimestamps }: DecodeVideoFrameCanvasInput): Promise<HTMLCanvasElement> {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error("无法读取本地视频文件。");
  const source = await response.blob();
  const { ALL_FORMATS, BlobSource, CanvasSink, Input } = await import("mediabunny");
  const mediaInput = new Input({ source: new BlobSource(source), formats: ALL_FORMATS });

  try {
    const videoTrack = await mediaInput.getPrimaryVideoTrack();
    if (!videoTrack || !(await videoTrack.canDecode())) throw new Error("当前浏览器无法解码该视频帧。");
    const sink = new CanvasSink(videoTrack, { poolSize: 1 });
    const decodedFrame = await sink.getCanvas(frameTimestamp(frame, frameRate, durationSeconds, presentationTimestamps));
    if (!decodedFrame) throw new Error("无法解码指定视频帧。");
    const canvas = document.createElement("canvas");
    canvas.width = decodedFrame.canvas.width;
    canvas.height = decodedFrame.canvas.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法创建截图画布。");
    context.drawImage(decodedFrame.canvas, 0, 0);
    return canvas;
  } finally {
    mediaInput.dispose();
  }
}

export async function createFrameThumbnailDecoder(input: FrameThumbnailDecoderInput): Promise<FrameThumbnailDecoder> {
  const response = await fetch(input.sourceUrl);
  if (!response.ok) throw new Error("无法读取本地视频文件。");
  const source = await response.blob();
  const { ALL_FORMATS, BlobSource, CanvasSink, Input } = await import("mediabunny");
  const mediaInput = new Input({ source: new BlobSource(source), formats: ALL_FORMATS });
  const videoTrack = await mediaInput.getPrimaryVideoTrack();
  if (!videoTrack || !(await videoTrack.canDecode())) {
    mediaInput.dispose();
    throw new Error("当前浏览器无法解码该视频，不能生成帧缩略图。");
  }
  const sink = new CanvasSink(videoTrack, { width: THUMBNAIL_WIDTH });
  let disposed = false;

  return {
    async capture(frame, shouldContinue) {
      if (disposed || !shouldContinue()) throw new Error("帧请求已失效。");
      const timestamp = frameTimestamp(frame, input.frameRate, input.durationSeconds, input.presentationTimestamps);
      const wrappedCanvas = await sink.getCanvas(timestamp);
      if (!wrappedCanvas || disposed || !shouldContinue()) throw new Error("无法解码指定视频帧。");
      const blob = await canvasToJpeg(wrappedCanvas.canvas);
      if (disposed || !shouldContinue()) throw new Error("帧请求已失效。");
      const now = new Date().toISOString();
      const thumbnail: DerivedFrameThumbnail = {
        id: `frame-thumbnail:${input.projectId}:${frame}`,
        projectId: input.projectId,
        mediaFingerprint: input.mediaFingerprint,
        frame,
        width: wrappedCanvas.canvas.width,
        height: wrappedCanvas.canvas.height,
        mimeType: "image/jpeg",
        size: blob.size,
        createdAt: now,
        lastAccessedAt: now,
      };
      await projectRepository.saveDerivedFrameThumbnail(thumbnail, blob);
      return { frame, url: URL.createObjectURL(blob) };
    },
    dispose() {
      disposed = true;
      mediaInput.dispose();
    },
  };
}
