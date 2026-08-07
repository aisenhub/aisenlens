export const DEFAULT_TIMELINE_VIEW_STATE = Object.freeze({
  playheadTime: 0,
  waveformZoom: null,
  scrollLeft: 0
});

function normalizeTime(value, duration = 0) {
  const time = Math.max(0, Number(value) || 0);
  return duration > 0 ? Math.min(duration, time) : time;
}

export function normalizeTimelineViewState(value = {}, duration = 0) {
  const source = value && typeof value === 'object' ? value : {};
  const zoom = source.waveformZoom;
  let waveformZoom = null;

  if (zoom && typeof zoom === 'object') {
    const start = normalizeTime(zoom.start, duration);
    const end = normalizeTime(zoom.end, duration);
    if (end > start) waveformZoom = { start, end };
  }

  return {
    playheadTime: normalizeTime(source.playheadTime, duration),
    waveformZoom,
    scrollLeft: Math.max(0, Number(source.scrollLeft) || 0)
  };
}

export function createTimelineViewState(value = {}) {
  return normalizeTimelineViewState({ ...DEFAULT_TIMELINE_VIEW_STATE, ...value });
}
