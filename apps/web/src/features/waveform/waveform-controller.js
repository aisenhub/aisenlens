import {
  followWaveformPlayback,
  getWaveformMinViewDuration,
  getWaveformView
} from '../../utils/audio-waveform.js';

export function resetWaveformZoom(state) {
  state.zoom = null;
  return state;
}

export function zoomWaveformAtPoint(state, duration, ratio, zoomFactor) {
  const normalizedDuration = Math.max(0, Number(duration) || 0);
  if (!normalizedDuration) return null;
  const view = getWaveformView(normalizedDuration, state.zoom);
  const normalizedRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
  const anchor = view.start + normalizedRatio * (view.end - view.start);
  const minimumDuration = getWaveformMinViewDuration(normalizedDuration);
  const nextDuration = Math.max(
    minimumDuration,
    Math.min(normalizedDuration, (view.end - view.start) * (Number(zoomFactor) || 1))
  );
  if (nextDuration >= normalizedDuration - 0.000001) return resetWaveformZoom(state);
  const nextStart = Math.max(0, Math.min(normalizedDuration - nextDuration, anchor - normalizedRatio * nextDuration));
  state.zoom = { start: nextStart, end: nextStart + nextDuration };
  return state;
}

export function panWaveform(state, duration, initialZoom, shiftRatio) {
  if (!initialZoom) return state;
  const normalizedDuration = Math.max(0, Number(duration) || 0);
  const viewDuration = initialZoom.end - initialZoom.start;
  const start = Math.max(
    0,
    Math.min(normalizedDuration - viewDuration, initialZoom.start + Number(shiftRatio || 0) * viewDuration)
  );
  state.zoom = { start, end: start + viewDuration };
  return state;
}

export function followWaveform(state, duration, currentTime, playing = true, force = false) {
  const nextZoom = followWaveformPlayback({ zoom: state.zoom, duration, currentTime, playing, force });
  if (nextZoom) state.zoom = nextZoom;
  return !!nextZoom;
}
