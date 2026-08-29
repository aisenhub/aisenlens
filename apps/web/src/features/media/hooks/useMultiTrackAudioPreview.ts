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
}

interface ScheduledAudioPreview {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

function createAudioContext(): AudioContext | null {
  const Constructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Constructor ? new Constructor() : null;
}

function applyClipGain(gain: GainNode, clip: AudioMixClip, mediaTime: number, contextTime: number): void {
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
  if (fadeInRemaining > 0) gain.gain.linearRampToValueAtTime(clip.gain, contextTime + fadeInRemaining);
  if (clip.fadeOutSeconds > 0 && !startsInFadeOut) {
    gain.gain.setValueAtTime(clip.gain, contextTime + Math.max(0, fadeOutStart - elapsed));
    gain.gain.linearRampToValueAtTime(0, contextTime + remaining);
  } else if (startsInFadeOut && remaining > 0) gain.gain.linearRampToValueAtTime(0, contextTime + remaining);
}

export default function useMultiTrackAudioPreview({ mediaAssets, audioTracks, frameRate, currentTime, isPlaying }: UseMultiTrackAudioPreviewInput): void {
  const contextRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef(new Map<string, AudioBuffer>());
  const scheduledRef = useRef<ScheduledAudioPreview[]>([]);
  const lastScheduleRef = useRef<{ mediaTime: number; contextTime: number } | null>(null);
  const requestRef = useRef(0);

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
    stopScheduledAudio();
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying || !audioTracks.length) return;
    const context = contextRef.current ?? createAudioContext();
    if (!context) return;
    contextRef.current = context;
    const expectedMediaTime = lastScheduleRef.current ? lastScheduleRef.current.mediaTime + (context.currentTime - lastScheduleRef.current.contextTime) : null;
    if (expectedMediaTime !== null && Math.abs(expectedMediaTime - currentTime) < 0.35) return;

    const requestId = ++requestRef.current;
    stopScheduledAudio();
    const clips = resolveAudioMixClips(audioTracks, mediaAssets, frameRate).filter((clip) => !clip.muted && currentTime >= clip.startSeconds && currentTime < clip.startSeconds + clip.durationSeconds);
    void context.resume().then(async () => {
      const now = context.currentTime;
      const scheduled = await Promise.all(clips.map(async (clip) => {
        let buffer = buffersRef.current.get(clip.assetId);
        if (!buffer) {
          const asset = mediaAssets.find((item) => item.id === clip.assetId);
          if (!asset) return null;
          buffer = await context.decodeAudioData((await loadMediaAssetArrayBuffer(asset)).slice(0));
          buffersRef.current.set(clip.assetId, buffer);
        }
        if (requestId !== requestRef.current) return null;
        const elapsed = currentTime - clip.startSeconds;
        const offsetSeconds = clip.offsetSeconds + elapsed;
        const durationSeconds = Math.min(clip.durationSeconds - elapsed, Math.max(0, buffer.duration - offsetSeconds));
        if (durationSeconds <= 0) return null;
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        applyClipGain(gain, clip, currentTime, now);
        source.connect(gain).connect(context.destination);
        source.start(now, offsetSeconds, durationSeconds);
        return { source, gain };
      }));
      if (requestId !== requestRef.current) return;
      scheduledRef.current = scheduled.filter((item): item is ScheduledAudioPreview => Boolean(item));
      lastScheduleRef.current = { mediaTime: currentTime, contextTime: now };
    }).catch(() => undefined);
  }, [audioTracks, currentTime, frameRate, isPlaying, mediaAssets]);

  useEffect(() => () => {
    requestRef.current += 1;
    stopScheduledAudio();
    void contextRef.current?.close();
  }, []);
}
