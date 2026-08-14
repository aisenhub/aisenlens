/// <reference lib="webworker" />

import { renderVideoOverlayCanvas } from "../../video/services/videoOverlayCanvasRenderer";
import type { VideoExportOverlaySegment, VideoExportWorkerMessage, VideoExportWorkerRequest, VideoExportWorkerResponse } from "./videoExportProtocol";

let cancelled = false;
let nextStreamWriteRequestId = 0;
const pendingStreamWrites = new Map<number, { resolve: () => void; reject: (error: Error) => void }>();

function report(message: VideoExportWorkerResponse): void {
  self.postMessage(message);
}

function formatTimecode(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const remainder = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function selectedContentOverlay(segments: VideoExportOverlaySegment[], frame: number, frameRate: number): VideoExportOverlaySegment["contentOverlay"] {
  const segment = segments.find((item) => frame >= item.startFrame && frame <= item.endFrame);
  if (!segment?.contentOverlay) return null;
  return {
    ...segment.contentOverlay,
    model: {
      ...segment.contentOverlay.model,
      timecode: segment.contentOverlay.settings.showTimecode ? formatTimecode(frame / frameRate) : null,
    },
  };
}

function assertActive(): void {
  if (cancelled) throw new Error("__EXPORT_CANCELLED__");
}

function createStreamTargetWritable(): WritableStream<import("./videoExportProtocol").VideoExportWriteChunk> {
  return new WritableStream({
    write(chunk) {
      return new Promise<void>((resolve, reject) => {
        const requestId = nextStreamWriteRequestId;
        nextStreamWriteRequestId += 1;
        pendingStreamWrites.set(requestId, { resolve, reject });
        self.postMessage({ type: "stream-write", requestId, chunk }, [chunk.data.buffer as ArrayBuffer]);
      });
    },
  });
}

async function addMixedAudio(
  audioSource: import("mediabunny").AudioSampleSource,
  audio: NonNullable<VideoExportWorkerRequest["audio"]>,
  AudioSample: typeof import("mediabunny").AudioSample,
): Promise<void> {
  const chunkFrames = Math.max(1, Math.min(audio.sampleRate, 48_000));
  for (let frameOffset = 0; frameOffset < audio.length; frameOffset += chunkFrames) {
    assertActive();
    const frameCount = Math.min(chunkFrames, audio.length - frameOffset);
    const data = new Float32Array(frameCount * audio.channels.length);
    audio.channels.forEach((channel, channelIndex) => {
      data.set(
        channel.subarray(frameOffset, frameOffset + frameCount),
        channelIndex * frameCount,
      );
    });
    const sample = new AudioSample({
      data,
      format: "f32-planar",
      numberOfChannels: audio.channels.length,
      sampleRate: audio.sampleRate,
      timestamp: frameOffset / audio.sampleRate,
    });
    try {
      await audioSource.add(sample);
    } finally {
      sample.close();
    }
  }
}

async function exportVideo(request: VideoExportWorkerRequest): Promise<void> {
  const mediabunny = await import("mediabunny");
  const { ALL_FORMATS, AudioSample, AudioSampleSource, BlobSource, BufferTarget, CanvasSink, Input, Mp4OutputFormat, Output, StreamTarget, VideoSample, VideoSampleSource, WebMOutputFormat, getFirstEncodableAudioCodec, getFirstEncodableVideoCodec } = mediabunny;
  const outputFormat = request.settings.format === "webm" ? new WebMOutputFormat() : new Mp4OutputFormat();
  const bufferTarget = request.streamed ? null : new BufferTarget();
  const target = request.streamed
    ? new StreamTarget(createStreamTargetWritable(), { chunked: true, chunkSize: 4 * 1024 * 1024 })
    : bufferTarget!;
  const output = new Output({ format: outputFormat, target });
  const videoCodec = await getFirstEncodableVideoCodec(outputFormat.getSupportedVideoCodecs(), {
    width: request.settings.width,
    height: request.settings.height,
    bitrate: request.settings.bitrate,
  });
  if (!videoCodec) throw new Error("当前浏览器不支持所选视频格式的编码器。");
  const videoSource = new VideoSampleSource({ codec: videoCodec, bitrate: request.settings.bitrate, keyFrameInterval: 2 });
  output.addVideoTrack(videoSource, { frameRate: request.settings.frameRate });

  let audioSource: InstanceType<typeof AudioSampleSource> | null = null;
  if (request.audio) {
    const audioCodec = await getFirstEncodableAudioCodec(outputFormat.getSupportedAudioCodecs(), {
      numberOfChannels: request.audio.channels.length,
      sampleRate: request.audio.sampleRate,
      bitrate: 192_000,
    });
    if (!audioCodec) throw new Error("当前浏览器不支持所选视频格式的音频编码器。");
    audioSource = new AudioSampleSource({ codec: audioCodec, bitrate: 192_000 });
    output.addAudioTrack(audioSource);
  }

  output.setMetadataTags({ title: request.title, date: new Date() });
  await output.start();
  const input = new Input({ source: new BlobSource(request.source), formats: ALL_FORMATS });
  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack || !(await videoTrack.canDecode())) throw new Error("当前浏览器无法解码原始视频，不能导出。");
    const sink = new CanvasSink(videoTrack, { width: request.settings.width, height: request.settings.height, fit: "contain", poolSize: 1 });
    const canvas = new OffscreenCanvas(request.settings.width, request.settings.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法创建离屏导出画布。");
    const totalFrames = Math.max(1, request.durationFrames);

    if (audioSource && request.audio) {
      report({ type: "progress", phase: "encoding-audio", completedFrames: 0, totalFrames });
      await addMixedAudio(audioSource, request.audio, AudioSample);
      audioSource.close();
      assertActive();
    }

    for (let frame = 0; frame < totalFrames; frame += 1) {
      assertActive();
      const decoded = await sink.getCanvas(Math.min(frame / request.settings.frameRate, Math.max(0, totalFrames / request.settings.frameRate - 0.001)));
      if (!decoded) throw new Error(`无法解码第 ${frame + 1} 帧。`);
      context.fillStyle = "#000000";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(decoded.canvas, 0, 0, canvas.width, canvas.height);
      renderVideoOverlayCanvas(context, {
        frame,
        width: canvas.width,
        height: canvas.height,
        compositionOverlay: request.settings.includeCompositionOverlay ? request.compositionOverlay : null,
        contentOverlay: request.settings.includeContentOverlay ? selectedContentOverlay(request.overlaySegments, frame, request.settings.frameRate) : null,
      });
      const bitmap = canvas.transferToImageBitmap();
      const sample = new VideoSample(bitmap, { timestamp: frame / request.settings.frameRate, duration: 1 / request.settings.frameRate });
      try {
        await videoSource.add(sample);
      } finally {
        sample.close();
        bitmap.close();
      }
      report({ type: "progress", phase: "encoding-video", completedFrames: frame + 1, totalFrames });
    }

    assertActive();
    report({ type: "progress", phase: "finalizing", completedFrames: totalFrames, totalFrames });
    videoSource.close();
    await output.finalize();
    if (request.streamed) {
      report({ type: "complete", buffer: null, mimeType: await output.getMimeType(), streamed: true });
      return;
    }
    const buffer = bufferTarget?.buffer;
    if (!buffer) throw new Error("视频封装未生成输出数据。");
    report({ type: "complete", buffer, mimeType: await output.getMimeType(), streamed: false });
  } catch (error) {
    if (output.state === "started" || output.state === "finalizing") await output.cancel().catch(() => undefined);
    throw error;
  } finally {
    input.dispose();
  }
}

self.onmessage = (event: MessageEvent<VideoExportWorkerMessage>) => {
  if (event.data.type === "cancel") {
    cancelled = true;
    return;
  }
  if (event.data.type === "stream-write-complete" || event.data.type === "stream-write-error") {
    const pending = pendingStreamWrites.get(event.data.requestId);
    if (!pending) return;
    pendingStreamWrites.delete(event.data.requestId);
    if (event.data.type === "stream-write-complete") pending.resolve();
    else pending.reject(new Error(event.data.message));
    return;
  }
  cancelled = false;
  pendingStreamWrites.clear();
  void exportVideo(event.data).catch((error) => {
    if (cancelled || error instanceof Error && error.message === "__EXPORT_CANCELLED__") report({ type: "cancelled" });
    else report({ type: "error", message: error instanceof Error ? error.message : "视频导出失败。" });
  });
};
