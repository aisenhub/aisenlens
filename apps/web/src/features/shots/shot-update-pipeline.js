import { updateShotDurations } from './shot-boundaries.js';
import { normalizeShotOrder } from './shot-store.js';
import { reconcileShotGroups } from '../groups/group-service.js';
import { formatTime } from '../../utils/time.js';

const editableFields = new Set([
  'time', 'segmentEnd', 'shotSize', 'cameraMove', 'analysis', 'custom',
  'image', 'imageThumbnail', 'lastFrameImage', 'lastFrameThumbnail',
  'width', 'height', 'lastFrameWidth', 'lastFrameHeight'
]);

export const SHOT_DERIVED_FIELDS = Object.freeze([
  'shotNumber', 'timecode', 'duration', 'durationSec', 'durationText'
]);

export const SHOT_CONSTRAINTS = Object.freeze([
  'time >= 0',
  'time <= videoDuration',
  'segmentEnd >= time',
  'shotNumber follows time order',
  'shot group members reference existing shots'
]);

const copyEntry = entry => ({ ...entry, custom: { ...(entry.custom || {}) } });

export function normalizeShotPatch(patch = {}) {
  const next = {};
  Object.entries(patch || {}).forEach(([key, value]) => {
    if (!editableFields.has(key)) return;
    if (key === 'time' || key === 'segmentEnd' || key.endsWith('Width') || key.endsWith('Height')) {
      const number = Number(value);
      if (Number.isFinite(number)) next[key] = Math.max(0, number);
      return;
    }
    if (key === 'custom') next.custom = { ...(value || {}) };
    else next[key] = value == null ? '' : String(value);
  });
  return next;
}

export function applyShotPatch(entries = [], shotId, patch = {}, { duration = 0 } = {}) {
  const normalizedPatch = normalizeShotPatch(patch);
  const maxDuration = Number(duration) > 0 ? Number(duration) : Number.MAX_SAFE_INTEGER;
  if (normalizedPatch.time !== undefined) normalizedPatch.time = Math.min(maxDuration, normalizedPatch.time);
  if (normalizedPatch.segmentEnd !== undefined) normalizedPatch.segmentEnd = Math.min(maxDuration, normalizedPatch.segmentEnd);
  const nextEntries = entries.map(entry => entry.shotId === shotId
    ? { ...copyEntry(entry), ...normalizedPatch }
    : copyEntry(entry));
  const ordered = normalizeShotOrder(nextEntries);
  const updated = ordered.find(entry => entry.shotId === shotId);
  if (updated && updated.segmentEnd !== undefined && updated.segmentEnd < updated.time) updated.segmentEnd = updated.time;
  if (updated && normalizedPatch.time !== undefined) updated.timecode = formatTime(updated.time);
  updateShotDurations(ordered, duration);
  return ordered;
}

export function updateShots(entries = [], shotPatches = [], { duration = 0, groups = [] } = {}) {
  let nextEntries = entries.map(copyEntry);
  for (const item of Array.isArray(shotPatches) ? shotPatches : []) {
    nextEntries = applyShotPatch(nextEntries, item.shotId, item.patch, { duration });
  }
  const nextGroups = reconcileShotGroups({ entries: nextEntries, shotGroups: groups }).shotGroups;
  return { entries: nextEntries, shotGroups: nextGroups };
}

export function normalizeShotState(entries = [], groups = [], { duration = 0 } = {}) {
  const ordered = normalizeShotOrder((entries || []).map(copyEntry));
  ordered.forEach(entry => {
    entry.time = Math.max(0, Math.min(Number(duration) || Number.MAX_SAFE_INTEGER, Number(entry.time) || 0));
    if (entry.segmentEnd !== undefined) {
      entry.segmentEnd = Math.max(entry.time, Math.min(Number(duration) || Number.MAX_SAFE_INTEGER, Number(entry.segmentEnd) || entry.time));
    }
    entry.timecode = formatTime(entry.time);
  });
  updateShotDurations(ordered, duration);
  return {
    entries: ordered,
    shotGroups: reconcileShotGroups({ entries: ordered, shotGroups: groups }).shotGroups
  };
}

export function createShotUpdatePipeline({
  getEntries = () => [],
  setEntries = () => {},
  getGroups = () => [],
  setGroups = () => {},
  getDuration = () => 0,
  render = () => {},
  markDirty = () => {}
} = {}) {
  const apply = (shotId, patch) => {
    const result = updateShots(getEntries(), [{ shotId, patch }], { duration: getDuration(), groups: getGroups() });
    setEntries(result.entries);
    setGroups(result.shotGroups);
    render(result);
    markDirty();
    return result;
  };
  return { apply, updateShots: patches => {
    const result = updateShots(getEntries(), patches, { duration: getDuration(), groups: getGroups() });
    setEntries(result.entries);
    setGroups(result.shotGroups);
    render(result);
    markDirty();
    return result;
  } };
}
