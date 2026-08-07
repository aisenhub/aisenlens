import { createEntityId } from '../../utils/ids.js';
import { formatTime } from '../../utils/time.js';

export const AUTO_SHOT_SEGMENT_DURATION = 60;
export const AUTO_SHOT_SEGMENT_OVERLAP = 2;

export function createAutoShotSegmentState(start, end, settings = {}) {
  const normalizedStart = Math.max(0, Number(start) || 0);
  const normalizedEnd = Math.max(normalizedStart, Number(end) || 0);
  return {
    active: true,
    start: normalizedStart,
    end: normalizedEnd,
    cursor: normalizedStart,
    diff: settings.autoShotDiff,
    minGap: settings.autoShotMinGap,
    completed: normalizedStart >= normalizedEnd - 0.001
  };
}

export function hasMoreAutoShotSegments(state) {
  return Boolean(
    state
    && state.active
    && state.cursor < state.end - 0.001
    && !state.completed
  );
}

export function getAutoShotSegmentRange(state) {
  if (!state) return { start: 0, end: 0, scanStart: 0 };
  const start = state.cursor;
  const end = Math.min(state.end, start + AUTO_SHOT_SEGMENT_DURATION);
  return {
    start,
    end,
    scanStart: Math.max(state.start, start - AUTO_SHOT_SEGMENT_OVERLAP)
  };
}

export function formatAutoShotSegmentRange(start, end) {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function filterAutoShotCuts(detected, state, entries = [], tolerance = 0.05) {
  const segmentStart = state.cursor;
  const segmentEnd = Math.min(state.end, segmentStart + AUTO_SHOT_SEGMENT_DURATION);
  const cuts = (detected || [])
    .filter(cut => cut && cut.time >= segmentStart - tolerance && cut.time <= segmentEnd + tolerance)
    .sort((first, second) => first.time - second.time);
  if (segmentStart <= state.start + tolerance
    && !cuts.some(cut => Math.abs(cut.time - segmentStart) <= tolerance)) {
    cuts.unshift({ time: segmentStart, score: 0 });
  }
  return cuts.filter((cut, index) => {
    const time = Number(cut.time);
    if (!Number.isFinite(time)) return false;
    if (entries.some(entry => Math.abs(Number(entry.time) - time) <= tolerance)) return false;
    return cuts.findIndex(candidate => Math.abs(Number(candidate.time) - time) <= tolerance) === index;
  });
}

export function createAutoShotEntry(cut, shotNumber, segmentStart) {
  const time = Number(cut.time);
  return {
    shotNumber,
    shotId: createEntityId('shot'),
    time,
    timecode: formatTime(time),
    image: '',
    width: 0,
    height: 0,
    shotSize: '',
    cameraMove: '',
    analysis: '',
    custom: {},
    duration: 0,
    durationText: '',
    autoShotSegmentStart: segmentStart
  };
}
