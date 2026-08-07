export const AUDIO_WAVEFORM_MAX_BINS = 1800;

export function getWaveformMinViewDuration(duration) {
  const normalizedDuration = Math.max(0, Number(duration) || 0);
  return Math.min(normalizedDuration, Math.max(normalizedDuration / 32, 0.25));
}

export function getWaveformView(duration, zoom = null) {
  const normalizedDuration = Math.max(0, Number(duration) || 0);
  if (!normalizedDuration || !zoom) return { start: 0, end: normalizedDuration };

  const minimumDuration = getWaveformMinViewDuration(normalizedDuration);
  let start = Math.max(0, Math.min(normalizedDuration, Number(zoom.start) || 0));
  let end = Math.max(0, Math.min(normalizedDuration, Number(zoom.end) || normalizedDuration));
  if (end <= start) return { start: 0, end: normalizedDuration };
  if (end - start < minimumDuration) {
    const center = (start + end) / 2;
    start = Math.max(0, Math.min(normalizedDuration - minimumDuration, center - minimumDuration / 2));
    end = start + minimumDuration;
  }
  return { start, end };
}

export function followWaveformPlayback({
  zoom,
  duration,
  currentTime,
  playing = true,
  force = false
} = {}) {
  if (!zoom || (!force && !playing)) return null;
  const normalizedDuration = Math.max(0, Number(duration) || 0);
  if (!normalizedDuration) return null;

  const view = getWaveformView(normalizedDuration, zoom);
  const viewDuration = view.end - view.start;
  const time = Math.max(0, Math.min(normalizedDuration, Number(currentTime) || 0));
  const lowerEdge = view.start + viewDuration * 0.18;
  const upperEdge = view.start + viewDuration * 0.82;
  let nextStart = view.start;
  if (time < lowerEdge) nextStart = time - viewDuration * 0.3;
  if (time > upperEdge) nextStart = time - viewDuration * 0.7;
  nextStart = Math.max(0, Math.min(normalizedDuration - viewDuration, nextStart));
  if (Math.abs(nextStart - view.start) < 0.0001) return null;
  return { start: nextStart, end: nextStart + viewDuration };
}

export function getWaveformShotRange(entry, sortedEntries = [], duration = 0) {
  const normalizedDuration = Math.max(0, Number(duration) || 0);
  const start = Math.max(0, Number(entry && entry.time) || 0);
  const next = sortedEntries[sortedEntries.indexOf(entry) + 1];
  const fallbackEnd = next ? Number(next.time) : normalizedDuration;
  const explicitEnd = Number(entry && entry.segmentEnd);
  const end = Number.isFinite(explicitEnd) && explicitEnd > start ? explicitEnd : fallbackEnd;
  return {
    start,
    end: Math.max(start, Math.min(normalizedDuration, Number(end) || normalizedDuration))
  };
}

export function getWaveformCurrentEntry(sortedEntries = [], duration = 0, currentTime = 0) {
  const time = Math.max(0, Number(currentTime) || 0);
  let latestEntry = null;
  for (const entry of sortedEntries) {
    const range = getWaveformShotRange(entry, sortedEntries, duration);
    if (time < range.start) break;
    latestEntry = entry;
    if (time < range.end) return entry;
  }
  return latestEntry;
}

export async function buildAudioWaveformBins(audioBuffer, {
  maxBins = AUDIO_WAVEFORM_MAX_BINS,
  yieldFn = () => Promise.resolve(),
  isCancelled = () => false
} = {}) {
  const channelCount = Math.min(2, Number(audioBuffer && audioBuffer.numberOfChannels) || 0);
  const sampleLength = Number(audioBuffer && audioBuffer.length) || 0;
  if (!channelCount || !sampleLength) return [];

  const duration = Number(audioBuffer.duration) || 0;
  const binCount = Math.min(maxBins, Math.max(240, Math.ceil(duration * 12)));
  const channels = Array.from({ length: channelCount }, (_, index) => audioBuffer.getChannelData(index));
  const bins = [];

  for (let index = 0; index < binCount; index++) {
    const start = Math.floor(index * sampleLength / binCount);
    const end = Math.max(start + 1, Math.min(sampleLength, Math.floor((index + 1) * sampleLength / binCount)));
    let peak = 0;
    let squareSum = 0;
    for (let sampleIndex = start; sampleIndex < end; sampleIndex++) {
      let sample = 0;
      for (let channelIndex = 0; channelIndex < channelCount; channelIndex++) sample += channels[channelIndex][sampleIndex] || 0;
      sample /= channelCount;
      const absolute = Math.abs(sample);
      peak = Math.max(peak, absolute);
      squareSum += sample * sample;
    }
    bins.push({ peak, rms: Math.sqrt(squareSum / Math.max(1, end - start)) });
    if (index > 0 && index % 64 === 0) {
      await yieldFn();
      if (isCancelled()) return null;
    }
  }
  return bins;
}
