import { resolveContentOverlay } from "../../content-overlay/services/contentOverlayResolver";
import { loadMediaAssetBlob } from "../../media/services/mediaAssetResourceService";
import { mixAudioOffline, resolveAudioMixClips } from "../../media/services/audioMixService";
import projectRepository from "../../project/services/projectRepository";
import type { MediaAsset, ProjectRecord, ProjectTemplateSnapshotRecord, StoredShotRecord } from "../../project/types";
import type { VideoExportAudioData, VideoExportFormat, VideoExportOverlaySegment, VideoExportPhase, VideoExportSettings, VideoExportWorkerResponse, VideoExportWriteChunk } from "./videoExportProtocol";

export interface VideoExportProgress {
  phase: VideoExportPhase;
  completedFrames: number;
  totalFrames: number;
}

export interface VideoExportResult {
  blob: Blob | null;
  mimeType: string;
  streamed: boolean;
}

export interface VideoExportFormatCapability {
  format: VideoExportFormat;
  videoCodec: string | null;
  audioCodec: string | null;
  supported: boolean;
  audioSupported: boolean;
}

export interface VideoExportJob {
  result: Promise<VideoExportResult>;
  cancel: () => void;
}

export interface StartVideoExportInput {
  project: ProjectRecord;
  settings?: Partial<VideoExportSettings>;
  onProgress?: (progress: VideoExportProgress) => void;
  writable?: WritableStream<VideoExportWriteChunk>;
}

function requirePrimaryVideo(project: ProjectRecord): MediaAsset {
  const asset = project.mediaAssets.find((item) => item.id === project.primaryVideoAssetId && item.kind === "video");
  if (!asset?.metadata) throw new Error("项目没有可用于导出的主视频素材。");
  return asset;
}

function defaultSettings(asset: MediaAsset): VideoExportSettings {
  const width = asset.metadata?.width ?? 1920;
  const height = asset.metadata?.height ?? 1080;
  return {
    format: "mp4",
    width: width - width % 2,
    height: height - height % 2,
    frameRate: asset.metadata?.frameRate ?? 30,
    bitrate: 8_000_000,
    includeAudio: true,
    includeOriginalAudio: true,
    includeContentOverlay: true,
    includeCompositionOverlay: true,
  };
}

function normalizeSettings(asset: MediaAsset, settings?: Partial<VideoExportSettings>): VideoExportSettings {
  const merged = { ...defaultSettings(asset), ...settings };
  const width = Math.floor(merged.width);
  const height = Math.floor(merged.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 2 || height < 2) throw new Error("导出分辨率无效。");
  if (!Number.isFinite(merged.frameRate) || merged.frameRate <= 0) throw new Error("导出帧率无效。");
  if (!Number.isFinite(merged.bitrate) || merged.bitrate <= 0) throw new Error("导出码率无效。");
  return { ...merged, width: width - width % 2, height: height - height % 2 };
}

export async function getVideoExportCapabilities(width: number, height: number): Promise<VideoExportFormatCapability[]> {
  const { Mp4OutputFormat, WebMOutputFormat, getFirstEncodableAudioCodec, getFirstEncodableVideoCodec } = await import("mediabunny");
  return Promise.all((["mp4", "webm"] as const).map(async (format) => {
    const outputFormat = format === "mp4" ? new Mp4OutputFormat() : new WebMOutputFormat();
    const [videoCodec, audioCodec] = await Promise.all([
      getFirstEncodableVideoCodec(outputFormat.getSupportedVideoCodecs(), { width, height, bitrate: 8_000_000 }),
      getFirstEncodableAudioCodec(outputFormat.getSupportedAudioCodecs(), { numberOfChannels: 2, sampleRate: 48_000, bitrate: 192_000 }),
    ]);
    return {
      format,
      videoCodec,
      audioCodec,
      supported: Boolean(videoCodec),
      audioSupported: Boolean(audioCodec),
    };
  }));
}

function formatTimecode(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const remainder = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function createOverlaySegments(project: ProjectRecord, shots: StoredShotRecord[], template: ProjectTemplateSnapshotRecord | null, settings: VideoExportSettings): VideoExportOverlaySegment[] {
  if (!settings.includeContentOverlay || !project.contentOverlay.enabled) return [];
  const fields = template?.fields ?? [];
  return shots.slice().sort((left, right) => left.order - right.order).map((shot, index) => ({
    startFrame: shot.startFrame,
    endFrame: shot.endFrame,
    contentOverlay: {
      settings: project.contentOverlay,
      model: resolveContentOverlay({
        settings: project.contentOverlay,
        fields,
        values: shot.analysisFields,
        description: shot.description,
        analysis: shot.notes,
        shotIndex: index,
        currentTimecode: formatTimecode(shot.startFrame / settings.frameRate),
        durationSeconds: (shot.endFrame - shot.startFrame + 1) / settings.frameRate,
      }),
    },
  }));
}

async function decodeAudioBuffer(context: AudioContext, asset: MediaAsset): Promise<AudioBuffer> {
  return context.decodeAudioData(await (await loadMediaAssetBlob(asset)).arrayBuffer());
}

async function prepareAudio(project: ProjectRecord, primaryVideo: MediaAsset, settings: VideoExportSettings, durationSeconds: number, report: (phase: VideoExportPhase) => void): Promise<VideoExportAudioData | null> {
  if (!settings.includeAudio) return null;
  const clips = resolveAudioMixClips(project.audioTracks, project.mediaAssets, settings.frameRate);
  const shouldIncludePrimaryAudio = settings.includeOriginalAudio && primaryVideo.metadata?.hasAudio === true;
  if (!clips.length && !shouldIncludePrimaryAudio) return null;
  const Constructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Constructor) throw new Error("当前浏览器不支持音频解码，不能导出带声音的视频。");
  report("mixing-audio");
  const context = new Constructor();
  const decoded = new Map<string, AudioBuffer>();
  try {
    const decodeAsset = async (assetId: string) => {
      const cached = decoded.get(assetId);
      if (cached) return cached;
      const asset = project.mediaAssets.find((item) => item.id === assetId);
      if (!asset) throw new Error("音频素材不存在。");
      const buffer = await decodeAudioBuffer(context, asset);
      decoded.set(assetId, buffer);
      return buffer;
    };
    const primaryAudio = shouldIncludePrimaryAudio ? await decodeAsset(primaryVideo.id) : null;
    const sampleRate = primaryAudio?.sampleRate ?? 48_000;
    const channelCount = Math.min(2, Math.max(1, primaryAudio?.numberOfChannels ?? 2));
    const mixed = await mixAudioOffline({ durationSeconds, sampleRate, channelCount, clips, primaryAudio, decodeAsset });
    return {
      channels: Array.from({ length: mixed.numberOfChannels }, (_, index) => mixed.getChannelData(index).slice()),
      sampleRate: mixed.sampleRate,
      length: mixed.length,
    };
  } finally {
    await context.close();
  }
}

export function startVideoExport({ project, settings: settingsInput, onProgress, writable }: StartVideoExportInput): VideoExportJob {
  let worker: Worker | null = null;
  let cancelled = false;
  const streamWriter = writable?.getWriter();
  const result = (async (): Promise<VideoExportResult> => {
    const primaryVideo = requirePrimaryVideo(project);
    const settings = normalizeSettings(primaryVideo, settingsInput);
    const durationSeconds = primaryVideo.metadata!.durationSeconds;
    const durationFrames = primaryVideo.metadata!.durationFrames ?? Math.max(1, Math.round(durationSeconds * settings.frameRate));
    onProgress?.({ phase: "preparing", completedFrames: 0, totalFrames: durationFrames });
    const [source, shots, template] = await Promise.all([
      loadMediaAssetBlob(primaryVideo),
      projectRepository.listProjectShots(project.id),
      projectRepository.getProjectTemplate(project.id),
    ]);
    if (cancelled) throw new Error("导出已取消。");
    const audio = await prepareAudio(project, primaryVideo, settings, durationSeconds, (phase) => onProgress?.({ phase, completedFrames: 0, totalFrames: durationFrames }));
    if (cancelled) throw new Error("导出已取消。");
    const overlaySegments = createOverlaySegments(project, shots, template, settings);

    return new Promise<VideoExportResult>((resolve, reject) => {
      worker = new Worker(new URL("./videoExport.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<VideoExportWorkerResponse>) => {
        const message = event.data;
        if (message.type === "progress") {
          onProgress?.({ phase: message.phase, completedFrames: message.completedFrames, totalFrames: message.totalFrames });
          return;
        }
        if (message.type === "stream-write") {
          if (!streamWriter) {
            worker?.postMessage({ type: "stream-write-error", requestId: message.requestId, message: "当前导出没有可用的文件写入目标。" });
            return;
          }
          void streamWriter.write(message.chunk).then(
            () => worker?.postMessage({ type: "stream-write-complete", requestId: message.requestId }),
            (error) => worker?.postMessage({
              type: "stream-write-error",
              requestId: message.requestId,
              message: error instanceof Error ? error.message : "无法写入导出文件。",
            }),
          );
          return;
        }
        worker?.terminate();
        worker = null;
        void (async () => {
          if (message.type === "complete") {
            try {
              if (message.streamed) await streamWriter?.close();
              resolve({
                blob: !message.streamed && message.buffer ? new Blob([message.buffer], { type: message.mimeType }) : null,
                mimeType: message.mimeType,
                streamed: message.streamed,
              });
            } catch (error) {
              reject(error instanceof Error ? error : new Error("无法完成导出文件写入。"));
            }
            return;
          }
          await streamWriter?.abort(message.type === "error" ? message.message : "导出已取消。").catch(() => undefined);
          reject(new Error(message.type === "error" ? message.message : "导出已取消。"));
        })();
      };
      worker.onerror = () => {
        worker?.terminate();
        worker = null;
        void streamWriter?.abort("视频导出 Worker 发生错误。").catch(() => undefined);
        reject(new Error("视频导出 Worker 发生错误。"));
      };
      const transfer: Transferable[] = audio?.channels.map((channel) => channel.buffer) ?? [];
      worker.postMessage({
        type: "start",
        source,
        title: project.title,
        settings,
        durationFrames,
        overlaySegments,
        compositionOverlay: settings.includeCompositionOverlay ? project.compositionOverlay : null,
        audio,
        streamed: Boolean(writable),
      }, transfer);
    });
  })();

  return {
    result,
    cancel: () => {
      cancelled = true;
      void streamWriter?.abort("导出已取消。").catch(() => undefined);
      worker?.postMessage({ type: "cancel" });
    },
  };
}
