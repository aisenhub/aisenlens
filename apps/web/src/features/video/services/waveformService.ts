import projectRepository from "../../project/services/projectRepository";
import type { DerivedWaveform, MediaSourceFingerprint } from "../../project/types";

interface LoadOrGenerateWaveformInput {
  projectId: string;
  sourceUrl: string;
  mediaFingerprint: MediaSourceFingerprint;
  durationSeconds: number;
}

const MAX_WAVEFORM_BINS = 1_200;
const MIN_WAVEFORM_BINS = 240;
const pendingWaveforms = new Map<string, Promise<number[]>>();

function getAudioContext(): AudioContext {
  const AudioContextConstructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) throw new Error("当前浏览器不支持音频波形分析。");
  return new AudioContextConstructor();
}

function buildPeakBins(audioBuffer: AudioBuffer, durationSeconds: number): number[] {
  const binCount = Math.min(MAX_WAVEFORM_BINS, Math.max(MIN_WAVEFORM_BINS, Math.ceil(durationSeconds * 12)));
  const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, index) => audioBuffer.getChannelData(index));
  if (!channels.length) throw new Error("视频不包含可分析的音轨。");
  return Array.from({ length: binCount }, (_, binIndex) => {
    const start = Math.floor((binIndex / binCount) * audioBuffer.length);
    const end = Math.max(start + 1, Math.floor(((binIndex + 1) / binCount) * audioBuffer.length));
    let peak = 0;
    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      for (const channel of channels) peak = Math.max(peak, Math.abs(channel[sampleIndex] ?? 0));
    }
    return peak;
  });
}

export async function loadOrGenerateWaveform({ projectId, sourceUrl, mediaFingerprint, durationSeconds }: LoadOrGenerateWaveformInput): Promise<number[]> {
  const cached = await projectRepository.getDerivedWaveform(projectId, mediaFingerprint);
  if (cached) return cached.peaks;

  const cacheKey = `${projectId}:${mediaFingerprint.name}:${mediaFingerprint.size}:${mediaFingerprint.lastModified}:${mediaFingerprint.mimeType}`;
  const pending = pendingWaveforms.get(cacheKey);
  if (pending) return pending;

  const generation = generateWaveform({ projectId, sourceUrl, mediaFingerprint, durationSeconds });
  pendingWaveforms.set(cacheKey, generation);
  try {
    return await generation;
  } finally {
    pendingWaveforms.delete(cacheKey);
  }
}

async function generateWaveform({ projectId, sourceUrl, mediaFingerprint, durationSeconds }: LoadOrGenerateWaveformInput): Promise<number[]> {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error("无法读取本地视频音轨。");
  const source = await response.arrayBuffer();
  const audioContext = getAudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(source.slice(0));
    const peaks = buildPeakBins(audioBuffer, durationSeconds);
    const timestamp = new Date().toISOString();
    const waveform: DerivedWaveform = {
      id: `waveform:${projectId}`,
      projectId,
      mediaFingerprint,
      durationSeconds,
      peaks,
      createdAt: timestamp,
      lastAccessedAt: timestamp,
    };
    await projectRepository.saveDerivedWaveform(waveform);
    return peaks;
  } finally {
    void audioContext.close();
  }
}
