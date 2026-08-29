import type { AudioTrack, MediaAsset, MediaAssetMetadata, MediaSourceFingerprint } from "../types";

export interface SelectedVideo {
  file: File;
  handle: FileSystemFileHandle | null;
}

export interface SelectedAudio {
  file: File;
  handle: FileSystemFileHandle | null;
}

interface WindowWithFilePicker extends Window {
  showOpenFilePicker?: (options: {
    multiple?: boolean;
    types?: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<FileSystemFileHandle[]>;
}

interface FileSystemHandleWithPermission extends FileSystemFileHandle {
  queryPermission: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
}

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".m4v", ".webm", ".mkv"];
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/x-m4v", "video/webm", "video/x-matroska"]);
const AUDIO_EXTENSIONS = [".aac", ".flac", ".m4a", ".mp3", ".ogg", ".opus", ".wav", ".webm"];
const AUDIO_MIME_TYPES = new Set(["audio/aac", "audio/flac", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/opus", "audio/wav", "audio/webm"]);

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
};

function inferMimeTypeFromName(name: string): string {
  const extension = `.${name.split(".").pop()?.toLowerCase() ?? ""}`;
  return MIME_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream";
}

export function normalizeMediaSourceFingerprint(source: MediaSourceFingerprint): MediaSourceFingerprint {
  return source.mimeType ? source : { ...source, mimeType: inferMimeTypeFromName(source.name) };
}

function createFingerprint(file: File): MediaSourceFingerprint {
  return {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    mimeType: file.type || inferMimeTypeFromName(file.name),
  };
}

function fingerprintsMatch(left: MediaSourceFingerprint, right: MediaSourceFingerprint): boolean {
  const normalizedLeft = normalizeMediaSourceFingerprint(left);
  const normalizedRight = normalizeMediaSourceFingerprint(right);
  return normalizedLeft.name === normalizedRight.name
    && normalizedLeft.size === normalizedRight.size
    && normalizedLeft.lastModified === normalizedRight.lastModified
    && normalizedLeft.mimeType === normalizedRight.mimeType;
}

function readNativeVideoMetadata(file: File): Promise<MediaAssetMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const durationSeconds = Number.isFinite(video.duration) ? video.duration : 0;
      cleanup();
      resolve({
        durationSeconds,
        durationFrames: null,
        frameRate: null,
        width: video.videoWidth,
        height: video.videoHeight,
        hasAudio: null,
        audioChannelCount: null,
        audioSampleRate: null,
      });
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("无法读取该视频的元数据，请选择浏览器支持的视频文件。"));
    };
    video.src = objectUrl;
  });
}

async function readContainerVideoMetadata(file: File, fallback: MediaAssetMetadata): Promise<MediaAssetMetadata> {
  const { ALL_FORMATS, BlobSource, Input } = await import("mediabunny");
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const [duration, videoTrack, audioTrack] = await Promise.all([
      input.computeDuration(),
      input.getPrimaryVideoTrack(),
      input.getPrimaryAudioTrack(),
    ]);
    if (!videoTrack) throw new Error("所选文件不包含视频轨道。");
    const packetStats = await videoTrack.computePacketStats(100);
    const frameRate = Number.isFinite(packetStats.averagePacketRate) && packetStats.averagePacketRate > 0
      ? Math.round(packetStats.averagePacketRate * 1000) / 1000
      : null;
    const durationSeconds = Number.isFinite(duration) && duration > 0 ? duration : fallback.durationSeconds;
    return {
      durationSeconds,
      durationFrames: frameRate ? Math.round(durationSeconds * frameRate) : 0,
      frameRate,
      width: videoTrack.displayWidth || fallback.width,
      height: videoTrack.displayHeight || fallback.height,
      hasAudio: audioTrack !== null,
      audioChannelCount: audioTrack?.numberOfChannels ?? null,
      audioSampleRate: audioTrack?.sampleRate ?? null,
    };
  } finally {
    input.dispose();
  }
}

async function readVideoMetadata(file: File): Promise<MediaAssetMetadata> {
  const nativeMetadata = await readNativeVideoMetadata(file);
  try {
    return await readContainerVideoMetadata(file, nativeMetadata);
  } catch {
    return nativeMetadata;
  }
}

async function readAudioMetadata(file: File): Promise<MediaAssetMetadata> {
  const { ALL_FORMATS, BlobSource, Input } = await import("mediabunny");
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const [duration, audioTrack] = await Promise.all([input.computeDuration(), input.getPrimaryAudioTrack()]);
    if (!audioTrack) throw new Error("所选文件不包含音频轨道。");
    return {
      durationSeconds: Number.isFinite(duration) ? duration : 0,
      durationFrames: null,
      frameRate: null,
      width: null,
      height: null,
      hasAudio: true,
      audioChannelCount: audioTrack.numberOfChannels,
      audioSampleRate: audioTrack.sampleRate,
    };
  } finally {
    input.dispose();
  }
}

export function needsMediaMetadataRefresh(metadata: MediaAssetMetadata | null) {
  return !metadata
    || (metadata.width ?? 0) <= 0
    || (metadata.height ?? 0) <= 0
    || metadata.durationSeconds <= 0
    || !metadata.frameRate
    || (metadata.durationFrames ?? 0) <= 0
    || metadata.hasAudio === null;
}

export async function selectLocalVideo(): Promise<SelectedVideo> {
  const picker = (window as WindowWithFilePicker).showOpenFilePicker;
  if (picker) {
    try {
      const [handle] = await picker({
        multiple: false,
        types: [{ description: "视频文件", accept: {
          "video/mp4": [".mp4"],
          "video/quicktime": [".mov"],
          "video/x-m4v": [".m4v"],
          "video/webm": [".webm"],
          "video/x-matroska": [".mkv"],
        } }],
      });
      if (!handle) throw new Error("未选择视频文件。" );
      return { file: await handle.getFile(), handle };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
    }
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = VIDEO_EXTENSIONS.join(",");
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) resolve({ file, handle: null });
      else reject(new Error("未选择视频文件。"));
    };
    input.click();
  });
}

export async function selectLocalAudio(): Promise<SelectedAudio> {
  const picker = (window as WindowWithFilePicker).showOpenFilePicker;
  if (picker) {
    try {
      const [handle] = await picker({
        multiple: false,
        types: [{ description: "音频文件", accept: {
          "audio/aac": [".aac"],
          "audio/flac": [".flac"],
          "audio/mp4": [".m4a"],
          "audio/mpeg": [".mp3"],
          "audio/ogg": [".ogg", ".opus"],
          "audio/wav": [".wav"],
          "audio/webm": [".webm"],
        } }],
      });
      if (!handle) throw new Error("未选择音频文件。");
      return { file: await handle.getFile(), handle };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
    }
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = AUDIO_EXTENSIONS.join(",");
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) resolve({ file, handle: null });
      else reject(new Error("未选择音频文件。"));
    };
    input.click();
  });
}

export async function inspectLocalVideo(selectedVideo: SelectedVideo): Promise<Pick<MediaAsset, "source" | "metadata">> {
  const extension = `.${selectedVideo.file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  if (!VIDEO_MIME_TYPES.has(selectedVideo.file.type) && !VIDEO_EXTENSIONS.includes(extension)) {
    throw new Error("请选择视频文件。" );
  }
  return {
    source: createFingerprint(selectedVideo.file),
    metadata: await readVideoMetadata(selectedVideo.file),
  };
}

export async function inspectLocalAudio(selectedAudio: SelectedAudio): Promise<Pick<MediaAsset, "source" | "metadata">> {
  const extension = `.${selectedAudio.file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  if (!AUDIO_MIME_TYPES.has(selectedAudio.file.type) && !AUDIO_EXTENSIONS.includes(extension)) {
    throw new Error("请选择音频文件。");
  }
  return {
    source: createFingerprint(selectedAudio.file),
    metadata: await readAudioMetadata(selectedAudio.file),
  };
}

export function createLinkedVideoAsset(
  projectId: string,
  source: MediaSourceFingerprint,
  metadata: MediaAssetMetadata,
  isRelink: boolean,
  assetId: string = crypto.randomUUID(),
): MediaAsset {
  const now = new Date().toISOString();
  return {
    id: assetId,
    projectId,
    kind: "video",
    origin: "imported",
    name: source.name,
    status: "linked",
    source,
    metadata,
    linkedAt: now,
    relinkedAt: isRelink ? now : null,
    createdAt: now,
    updatedAt: now,
  };
}

export function createDefaultAudioTrack(projectId: string): AudioTrack {
  return {
    id: crypto.randomUUID(),
    projectId,
    name: "音频 1",
    order: 0,
    muted: false,
    gainDb: 0,
    clips: [],
  };
}

export function createLinkedAudioAsset(
  projectId: string,
  source: MediaSourceFingerprint,
  metadata: MediaAssetMetadata,
  name = source.name,
): MediaAsset {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    projectId,
    kind: "audio",
    origin: "imported",
    name,
    status: "linked",
    source,
    metadata,
    linkedAt: now,
    relinkedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function createRecordedAudioAsset(projectId: string, recording: Blob, name = `录音-${new Date().toISOString()}.webm`): Promise<{ asset: MediaAsset; blob: Blob }> {
  const file = new File([recording], name, { type: recording.type || "audio/webm" });
  const inspectedAudio = await inspectLocalAudio({ file, handle: null });
  const now = new Date().toISOString();
  return {
    asset: {
      id: crypto.randomUUID(),
      projectId,
      kind: "audio",
      origin: "recorded",
      name,
      status: "linked",
      source: inspectedAudio.source,
      metadata: inspectedAudio.metadata,
      linkedAt: now,
      relinkedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    blob: recording,
  };
}

export async function verifyLinkedMedia(
  handle: FileSystemFileHandle,
  expectedSource: MediaSourceFingerprint,
): Promise<"linked" | "needs-permission" | "missing"> {
  try {
    const permission = await (handle as FileSystemHandleWithPermission).queryPermission({ mode: "read" });
    if (permission !== "granted") return "needs-permission";
    const file = await handle.getFile();
    return fingerprintsMatch(createFingerprint(file), expectedSource) ? "linked" : "missing";
  } catch {
    return "missing";
  }
}

export async function requestMediaPermission(handle: FileSystemFileHandle): Promise<boolean> {
  try {
    return (await (handle as FileSystemHandleWithPermission).requestPermission({ mode: "read" })) === "granted";
  } catch {
    return false;
  }
}

export function isMatchingVideo(file: File, expectedSource: MediaSourceFingerprint): boolean {
  return fingerprintsMatch(createFingerprint(file), expectedSource);
}
