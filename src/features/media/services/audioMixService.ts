import type { AudioClip, AudioTrack, MediaAsset } from "../../project/types";

export interface AudioMixClip {
  clipId: string;
  trackId: string;
  assetId: string;
  startSeconds: number;
  offsetSeconds: number;
  durationSeconds: number;
  gain: number;
  muted: boolean;
  fadeInSeconds: number;
  fadeOutSeconds: number;
}

export interface OfflineAudioMixInput {
  durationSeconds: number;
  sampleRate: number;
  channelCount: number;
  clips: AudioMixClip[];
  primaryAudio?: AudioBuffer | null;
  decodeAsset: (assetId: string) => Promise<AudioBuffer>;
}

function framesToSeconds(frames: number, frameRate: number): number {
  return Math.max(0, frames / frameRate);
}

function clipToMixClip(track: AudioTrack, clip: AudioClip, asset: MediaAsset, frameRate: number): AudioMixClip | null {
  const assetDurationSeconds = asset.metadata?.durationSeconds ?? 0;
  const startSeconds = framesToSeconds(clip.startFrame, frameRate);
  const offsetSeconds = Math.min(framesToSeconds(clip.inFrame, frameRate), assetDurationSeconds);
  const requestedDurationSeconds = framesToSeconds(clip.durationFrames, frameRate);
  const durationSeconds = Math.min(requestedDurationSeconds, Math.max(0, assetDurationSeconds - offsetSeconds));
  if (durationSeconds <= 0) return null;

  return {
    clipId: clip.id,
    trackId: track.id,
    assetId: asset.id,
    startSeconds,
    offsetSeconds,
    durationSeconds,
    gain: 10 ** ((track.gainDb + clip.gainDb) / 20),
    muted: track.muted || clip.muted,
    fadeInSeconds: Math.min(framesToSeconds(clip.fadeInFrames, frameRate), durationSeconds),
    fadeOutSeconds: Math.min(framesToSeconds(clip.fadeOutFrames, frameRate), durationSeconds),
  };
}

export function resolveAudioMixClips(audioTracks: AudioTrack[], mediaAssets: MediaAsset[], frameRate: number): AudioMixClip[] {
  if (!Number.isFinite(frameRate) || frameRate <= 0) return [];
  const playableAssets = new Map(mediaAssets
    .filter((asset) => asset.status === "linked" && (asset.kind === "audio" || asset.metadata?.hasAudio === true))
    .map((asset) => [asset.id, asset]));

  return audioTracks
    .slice()
    .sort((left, right) => left.order - right.order)
    .flatMap((track) => track.clips.flatMap((clip) => {
      const asset = playableAssets.get(clip.assetId);
      const mixClip = asset ? clipToMixClip(track, clip, asset, frameRate) : null;
      return mixClip ? [mixClip] : [];
    }));
}

export async function mixAudioOffline({ durationSeconds, sampleRate, channelCount, clips, primaryAudio, decodeAsset }: OfflineAudioMixInput): Promise<AudioBuffer> {
  const OfflineContext = window.OfflineAudioContext;
  if (!OfflineContext) throw new Error("当前浏览器不支持离线音频混音。");
  const context = new OfflineContext(channelCount, Math.max(1, Math.ceil(durationSeconds * sampleRate)), sampleRate);

  if (primaryAudio) {
    const source = context.createBufferSource();
    source.buffer = primaryAudio;
    source.connect(context.destination);
    source.start(0, 0, Math.min(durationSeconds, primaryAudio.duration));
  }

  await Promise.all(clips.filter((clip) => !clip.muted).map(async (clip) => {
    const buffer = await decodeAsset(clip.assetId);
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(clip.gain, clip.startSeconds);
    if (clip.fadeInSeconds > 0) gain.gain.setValueAtTime(0, clip.startSeconds);
    if (clip.fadeInSeconds > 0) gain.gain.linearRampToValueAtTime(clip.gain, clip.startSeconds + clip.fadeInSeconds);
    if (clip.fadeOutSeconds > 0) gain.gain.setValueAtTime(clip.gain, clip.startSeconds + Math.max(0, clip.durationSeconds - clip.fadeOutSeconds));
    if (clip.fadeOutSeconds > 0) gain.gain.linearRampToValueAtTime(0, clip.startSeconds + clip.durationSeconds);
    source.connect(gain).connect(context.destination);
    source.start(clip.startSeconds, clip.offsetSeconds, clip.durationSeconds);
  }));

  return context.startRendering();
}
