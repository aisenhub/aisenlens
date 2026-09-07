import projectRepository from "../../project/services/projectRepository";
import type { DerivedWaveform, MediaSourceFingerprint } from "../../project/types";

interface LoadOrGenerateWaveformInput {
  projectId: string;
  sourceUrl: string;
  mediaFingerprint: MediaSourceFingerprint;
  durationSeconds: number;
  signal?: AbortSignal;
}

const MAX_WAVEFORM_BINS = 1_200;
const MIN_WAVEFORM_BINS = 240;
const pendingWaveforms = new Map<string, Promise<number[]>>();

function createPeakBins(durationSeconds: number): number[] {
  const binCount = Math.min(MAX_WAVEFORM_BINS, Math.max(MIN_WAVEFORM_BINS, Math.ceil(durationSeconds * 12)));
  return Array.from({ length: binCount }, () => 0);
}

function accumulatePeakBins(peaks: number[], audioBuffer: AudioBuffer, timestamp: number, durationSeconds: number, signal?: AbortSignal): void {
  const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, index) => audioBuffer.getChannelData(index));
  if (!channels.length) throw new Error("视频不包含可分析的音轨。");
  for (let sampleIndex = 0; sampleIndex < audioBuffer.length; sampleIndex += 1) {
    if (sampleIndex % 16_384 === 0) signal?.throwIfAborted();
    const time = timestamp + sampleIndex / audioBuffer.sampleRate;
    const binIndex = Math.min(peaks.length - 1, Math.max(0, Math.floor((time / durationSeconds) * peaks.length)));
    for (const channel of channels) peaks[binIndex] = Math.max(peaks[binIndex] ?? 0, Math.abs(channel[sampleIndex] ?? 0));
  }
}

export async function loadOrGenerateWaveform({ projectId, sourceUrl, mediaFingerprint, durationSeconds, signal }: LoadOrGenerateWaveformInput): Promise<number[]> {
  signal?.throwIfAborted();
  const cached = await projectRepository.getDerivedWaveform(projectId, mediaFingerprint);
  signal?.throwIfAborted();
  if (cached) return cached.peaks;

  const cacheKey = `${projectId}:${mediaFingerprint.name}:${mediaFingerprint.size}:${mediaFingerprint.lastModified}:${mediaFingerprint.mimeType}`;
  const pending = pendingWaveforms.get(cacheKey);
  if (pending) return pending;

  const generation = generateWaveform({ projectId, sourceUrl, mediaFingerprint, durationSeconds, signal });
  pendingWaveforms.set(cacheKey, generation);
  try {
    return await generation;
  } finally {
    pendingWaveforms.delete(cacheKey);
  }
}

async function generateWaveform({ projectId, sourceUrl, mediaFingerprint, durationSeconds, signal }: LoadOrGenerateWaveformInput): Promise<number[]> {
  signal?.throwIfAborted();
  const response = await fetch(sourceUrl, { signal });
  if (!response.ok) throw new Error("无法读取本地视频音轨。");
  const source = await response.blob();
  signal?.throwIfAborted();
  const peaks = createPeakBins(durationSeconds);
  const { ALL_FORMATS, AudioBufferSink, BlobSource, Input } = await import("mediabunny");
  const input = new Input({ source: new BlobSource(source), formats: ALL_FORMATS });
  try {
    const audioTrack = await input.getPrimaryAudioTrack();
    if (!audioTrack || !(await audioTrack.canDecode())) throw new Error("视频不包含可分析的音轨。");
    const sink = new AudioBufferSink(audioTrack);
    for await (const chunk of sink.buffers(0, durationSeconds)) {
      signal?.throwIfAborted();
      accumulatePeakBins(peaks, chunk.buffer, chunk.timestamp, durationSeconds, signal);
    }
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
    input.dispose();
  }
}
