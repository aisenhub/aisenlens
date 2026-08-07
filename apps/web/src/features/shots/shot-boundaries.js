function clampTime(time, duration) {
  const value = Number(time) || 0;
  const maxTime = Math.max(0, Number(duration) || 0);
  return Math.max(0, Math.min(maxTime, value));
}

export function updateShotDurations(entries = [], videoDuration = 0) {
  const ordered = [...entries].sort((first, second) => first.shotNumber - second.shotNumber);
  for (let index = 0; index < ordered.length; index += 1) {
    const current = ordered[index];
    const next = ordered[index + 1];
    const duration = next
      ? next.time - current.time
      : (typeof current.segmentEnd === 'number'
        ? Math.max(0, current.segmentEnd - current.time)
        : Math.max(0, (Number(videoDuration) || 0) - current.time));
    const seconds = duration > 0 ? Number(duration.toFixed(3)) : 0;
    current.duration = duration;
    current.durationSec = seconds;
    current.durationText = seconds > 0 ? `${seconds}s` : '';
  }
  return entries;
}

export function getShotEditorDefaultLastTime(entries, entry, videoDuration, frameStep) {
  const ordered = [...entries].sort((first, second) => first.shotNumber - second.shotNumber);
  const index = ordered.findIndex(item => item === entry || item.shotNumber === entry.shotNumber);
  const next = index >= 0 ? ordered[index + 1] : null;
  const boundary = next
    ? next.time
    : (typeof entry.segmentEnd === 'number' ? entry.segmentEnd : (Number(videoDuration) || entry.time));
  return Math.max(entry.time, boundary - frameStep);
}

export function getShotEditorTailBoundary(entries, draft, frameStep, videoDuration) {
  if (!draft) return { boundary: null, swallowed: [] };
  const lastTime = Number(draft.lastTime) || 0;
  const ordered = [...entries].sort((first, second) => first.time - second.time);
  const index = ordered.findIndex(item => item.shotNumber === draft.shotNumber);
  const following = index >= 0 ? ordered.slice(index + 1) : [];
  const swallowed = [];
  let keeper = null;
  for (const item of following) {
    if (item.time <= lastTime + frameStep / 2) swallowed.push(item);
    else {
      keeper = item;
      break;
    }
  }
  const boundary = keeper
    ? keeper.time
    : (Number(videoDuration) > 0 ? Number(videoDuration) : null);
  return { boundary, swallowed, keeper };
}

export function getShotEditorSplitRange(entries, draft, frameStep, videoDuration) {
  if (!draft) return null;
  const { boundary } = getShotEditorTailBoundary(entries, draft, frameStep, videoDuration);
  if (boundary === null) return null;
  const start = clampTime(Number(draft.lastTime) + frameStep, videoDuration);
  const end = clampTime(boundary - frameStep, videoDuration);
  if (!(end >= start) || boundary - Number(draft.lastTime) < frameStep * 1.5) return null;
  return { start, end };
}

export function getShotSegmentPlaybackEnd(entries, entry, videoDuration, frameStep) {
  if (!entry) return 0;
  const startTime = clampTime(entry.time, videoDuration);
  if (typeof entry.segmentEnd === 'number' && entry.segmentEnd > startTime) {
    return clampTime(entry.segmentEnd, videoDuration);
  }
  const ordered = [...entries].sort((first, second) => first.time - second.time);
  const index = ordered.findIndex(item => item.shotNumber === entry.shotNumber);
  const next = index >= 0 ? ordered[index + 1] : null;
  if (next) return clampTime(Math.max(startTime, next.time - frameStep), videoDuration);
  return clampTime(Number(videoDuration) > 0 ? videoDuration : startTime, videoDuration);
}
