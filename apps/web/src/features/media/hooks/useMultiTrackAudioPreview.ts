import { useEffect, useRef } from "react";
import type { AudioMixClip } from "../services/audioMixService";
import { resolveAudioMixClips } from "../services/audioMixService";
import { loadMediaAssetArrayBuffer } from "../services/mediaAssetResourceService";
import type { AudioTrack, MediaAsset } from "../../project/types";

interface UseMultiTrackAudioPreviewInput {
  mediaAssets: MediaAsset[];
  audioTracks: AudioTrack[];
  frameRate: number;
  currentTime: number;
  isPlaying: boolean;
  playbackRate?: number;
}

interface ScheduledAudioPreview {
  clipId: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

function createAudioContext(): AudioContext | null {
  const Constructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Constructor ? new Constructor() : null;
}

function applyClipGain(gain: GainNode, clip: AudioMixClip, mediaTime: number, contextTime: number, playbackRate: number): void {
  const rate = Math.max(0.01, playbackRate);
  const elapsed = Math.max(0, mediaTime - clip.startSeconds);
  const remaining = Math.max(0, clip.durationSeconds - elapsed);
  const fadeInRemaining = Math.max(0, clip.fadeInSeconds - elapsed);
  const fadeOutStart = Math.max(0, clip.durationSeconds - clip.fadeOutSeconds);
  const startsInFadeOut = elapsed >= fadeOutStart;
  const initialGain = startsInFadeOut && clip.fadeOutSeconds > 0
    ? clip.gain * (remaining / clip.fadeOutSeconds)
    : fadeInRemaining > 0 && clip.fadeInSeconds > 0
      ? clip.gain * (elapsed / clip.fadeInSeconds)
      : clip.gain;
  gain.gain.setValueAtTime(Math.max(0, initialGain), contextTime);
  if (fadeInRemaining > 0) gain.gain.linearRampToValueAtTime(clip.gain, contextTime + fadeInRemaining / rate);
  if (clip.fadeOutSeconds > 0 && !startsInFadeOut) {
    gain.gain.setValueAtTime(clip.gain, contextTime + Math.max(0, fadeOutStart - elapsed) / rate);
    gain.gain.linearRampToValueAtTime(0, contextTime + remaining / rate);
  } else if (startsInFadeOut && remaining > 0) gain.gain.linearRampToValueAtTime(0, contextTime + remaining / rate);
}

const MAX_PREVIEW_BUFFER_BYTES = 64 * 1024 * 1024;

function audioBufferBytes(buffer: AudioBuffer): number {
  return buffer.length * buffer.numberOfChannels * Float32Array.BYTES_PER_ELEMENT;
}

export default function useMultiTrackAudioPreview({ mediaAssets, audioTracks, frameRate, currentTime, isPlaying, playbackRate = 1 }: UseMultiTrackAudioPreviewInput): void {
  const LOOKAHEAD_SECONDS = 0.45;
  const contextRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef(new Map<string, AudioBuffer>());
  const bufferBytesRef = useRef(0);
  const scheduledRef = useRef<ScheduledAudioPreview[]>([]);
  const lastScheduleRef = useRef<{ mediaTime: number; contextTime: number; playbackRate: number; scheduledUntil: number } | null>(null);
  const requestRef = useRef(0);
  const lastTracksRef = useRef<{ audioTracks: AudioTrack[]; mediaAssets: MediaAsset[] } | null>(null);

  const stopScheduledAudio = () => {
    scheduledRef.current.forEach(({ source, gain }) => {
      try {
        source.stop();
      } catch {
        // An already-stopped source is safe to discard during cleanup.
      }
      source.disconnect();
      gain.disconnect();
    });
    scheduledRef.current = [];
    lastScheduleRef.current = null;
  };

  useEffect(() => {
    if (isPlaying) return;
    requestRef.current += 1;
    stopScheduledAudio();
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying || !audioTracks.length) {
      requestRef.current += 1;
      stopScheduledAudio();
      return;
    }
    const context = contextRef.current ?? createAudioContext();
    if (!context) return;
    contextRef.current = context;
    const previous = lastScheduleRef.current;
    const expectedMediaTime = previous
      ? previous.mediaTime + (context.currentTime - previous.contextTime) * previous.playbackRate
      : null;
    const inputsChanged = lastTracksRef.current?.audioTracks !== audioTracks || lastTracksRef.current?.mediaAssets !== mediaAssets;
    const rateChanged = previous?.playbackRate !== undefined && previous.playbackRate !== playbackRate;
    const seeked = expectedMediaTime !== null && Math.abs(expectedMediaTime - currentTime) >= 0.35;
    if (inputsChanged || rateChanged || seeked) stopScheduledAudio();
    if (!inputsChanged && !rateChanged && !seeked && previous && currentTime < previous.scheduledUntil - 0.05) return;

    const requestId = ++requestRef.current;
    const scheduledClipIds = new Set(scheduledRef.current.map((item) => item.clipId));
    const clips = resolveAudioMixClips(audioTracks, mediaAssets, frameRate).filter((clip) => !scheduledClipIds.has(clip.clipId) && !clip.muted && clip.startSeconds < currentTime + LOOKAHEAD_SECONDS && clip.startSeconds + clip.durationSeconds > currentTime);
    void context.resume().then(async () => {
      const now = context.currentTime;
      const scheduled = await Promise.all(clips.map(async (clip) => {
        let buffer = buffersRef.current.get(clip.assetId);
        if (buffer) {
          buffersRef.current.delete(clip.assetId);
          buffersRef.current.set(clip.assetId, buffer);
        }
        if (!buffer) {
          const asset = mediaAssets.find((item) => item.id === clip.assetId);
          if (!asset) return null;
          buffer = await context.decodeAudioData((await loadMediaAssetArrayBuffer(asset)).slice(0));
          const bytes = audioBufferBytes(buffer);
          buffersRef.current.set(clip.assetId, buffer);
          bufferBytesRef.current += bytes;
          while (bufferBytesRef.current > MAX_PREVIEW_BUFFER_BYTES && buffersRef.current.size > 1) {
            const oldest = buffersRef.current.entries().next().value as [string, AudioBuffer] | undefined;
            if (!oldest) break;
            buffersRef.current.delete(oldest[0]);
            bufferBytesRef.current -= audioBufferBytes(oldest[1]);
          }
        }
        if (requestId !== requestRef.current) return null;
        const elapsed = Math.max(0, currentTime - clip.startSeconds);
        const offsetSeconds = clip.offsetSeconds + elapsed;
        const remainingSeconds = Math.min(clip.durationSeconds - elapsed, Math.max(0, buffer.duration - offsetSeconds));
        const startDelaySeconds = Math.max(0, clip.startSeconds - currentTime) / Math.max(0.01, playbackRate);
        const sourceDurationSeconds = remainingSeconds;
        if (sourceDurationSeconds <= 0) return null;
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        source.playbackRate.value = playbackRate;
        applyClipGain(gain, clip, Math.max(currentTime, clip.startSeconds), now + startDelaySeconds, playbackRate);
        source.connect(gain).connect(context.destination);
        source.start(now + startDelaySeconds, offsetSeconds, sourceDurationSeconds);
        return { clipId: clip.clipId, source, gain };
      }));
      if (requestId !== requestRef.current) {
        scheduled.forEach((item) => {
          if (!item) return;
          try { item.source.stop(); } catch { /* source may already be stopped */ }
          item.source.disconnect();
          item.gain.disconnect();
        });
        return;
      }
      scheduledRef.current = [...scheduledRef.current, ...scheduled.filter((item): item is ScheduledAudioPreview => Boolean(item))];
      lastScheduleRef.current = { mediaTime: currentTime, contextTime: now, playbackRate, scheduledUntil: currentTime + LOOKAHEAD_SECONDS };
      lastTracksRef.current = { audioTracks, mediaAssets };
    }).catch(() => undefined);
  }, [audioTracks, currentTime, frameRate, isPlaying, mediaAssets, playbackRate]);

  useEffect(() => () => {
    requestRef.current += 1;
    stopScheduledAudio();
    void contextRef.current?.close();
  }, []);
}
