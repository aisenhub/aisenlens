export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function normalizePlaybackRate(value) {
  const rate = Number(value);
  return PLAYBACK_RATES.includes(rate) ? rate : 1;
}

export function getFrameStep(frameRate, fallback = 25) {
  const rate = Number(frameRate);
  return 1 / (Number.isFinite(rate) && rate > 0 ? rate : fallback);
}

export function clampPlaybackTime(time, duration) {
  const maxTime = Math.max(0, Number(duration) || 0);
  return Math.max(0, Math.min(maxTime, Number(time) || 0));
}

export function estimateFrameRateFromDuration(duration, candidates = [23.976, 24, 25, 29.97, 30, 50, 60]) {
  const normalizedDuration = Number(duration) || 0;
  if (!normalizedDuration) return 25;
  let best = 25;
  let bestDifference = Infinity;
  for (const candidate of candidates) {
    const rate = Number(candidate);
    if (!Number.isFinite(rate) || rate <= 0) continue;
    const difference = Math.abs(normalizedDuration * rate - Math.round(normalizedDuration * rate));
    if (difference < bestDifference) {
      bestDifference = difference;
      best = rate;
    }
  }
  return best;
}
