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
  signal?: AbortSignal;
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

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new DOMException("音频混音已取消。", "AbortError");
}

export async function mixAudioOffline({ durationSeconds, sampleRate, channelCount, clips, primaryAudio, decodeAsset, signal }: OfflineAudioMixInput): Promise<AudioBuffer> {
  const OfflineContext = window.OfflineAudioContext;
  if (!OfflineContext) throw new Error("当前浏览器不支持离线音频混音。");
  const chunkSeconds = 30;
  const outputLength = Math.max(1, Math.ceil(durationSeconds * sampleRate));
  const renderedChannels = Array.from({ length: channelCount }, () => new Float32Array(outputLength));

  for (let chunkStart = 0; chunkStart < durationSeconds; chunkStart += chunkSeconds) {
    throwIfAborted(signal);
    const chunkDuration = Math.min(chunkSeconds, durationSeconds - chunkStart);
    const context = new OfflineContext(channelCount, Math.max(1, Math.ceil(chunkDuration * sampleRate)), sampleRate);
    if (primaryAudio && chunkStart < primaryAudio.duration) {
      const source = context.createBufferSource();
      source.buffer = primaryAudio;
      source.connect(context.destination);
      source.start(0, chunkStart, Math.min(chunkDuration, primaryAudio.duration - chunkStart));
    }

    for (const clip of clips.filter((item) => !item.muted)) {
      throwIfAborted(signal);
      const overlapStart = Math.max(chunkStart, clip.startSeconds);
      const overlapEnd = Math.min(chunkStart + chunkDuration, clip.startSeconds + clip.durationSeconds);
      if (overlapEnd <= overlapStart) continue;
      const buffer = await decodeAsset(clip.assetId);
      throwIfAborted(signal);
      const elapsed = overlapStart - clip.startSeconds;
      const sourceOffset = clip.offsetSeconds + elapsed;
      const playableDuration = Math.min(overlapEnd - overlapStart, Math.max(0, buffer.duration - sourceOffset));
      if (playableDuration <= 0) continue;
      const relativeStart = overlapStart - chunkStart;
      const source = context.createBufferSource();
      const gain = context.createGain();
      const fadeInRemaining = Math.max(0, clip.fadeInSeconds - elapsed);
      const fadeOutStart = Math.max(0, clip.durationSeconds - clip.fadeOutSeconds);
      const initialGain = elapsed >= fadeOutStart && clip.fadeOutSeconds > 0
        ? clip.gain * Math.max(0, (clip.durationSeconds - elapsed) / clip.fadeOutSeconds)
        : fadeInRemaining > 0 && clip.fadeInSeconds > 0
          ? clip.gain * (elapsed / clip.fadeInSeconds)
          : clip.gain;
      gain.gain.setValueAtTime(initialGain, relativeStart);
      if (fadeInRemaining > 0) gain.gain.linearRampToValueAtTime(clip.gain, relativeStart + fadeInRemaining);
      if (clip.fadeOutSeconds > 0) {
        const fadeOutOffset = Math.max(0, fadeOutStart - elapsed);
        gain.gain.setValueAtTime(clip.gain, relativeStart + fadeOutOffset);
        gain.gain.linearRampToValueAtTime(0, relativeStart + playableDuration);
      }
      source.buffer = buffer;
      source.connect(gain).connect(context.destination);
      source.start(relativeStart, sourceOffset, playableDuration);
    }

    const rendered = await context.startRendering();
    const offset = Math.floor(chunkStart * sampleRate);
    for (let channel = 0; channel < channelCount; channel += 1) {
      renderedChannels[channel].set(rendered.getChannelData(Math.min(channel, rendered.numberOfChannels - 1)), offset);
    }
  }

  throwIfAborted(signal);
  const outputContext = new OfflineContext(channelCount, 1, sampleRate);
  const output = outputContext.createBuffer(channelCount, outputLength, sampleRate);
  renderedChannels.forEach((channel, index) => output.copyToChannel(channel, index));
  return output;
}
