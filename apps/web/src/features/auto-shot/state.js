export function createAutoShotVideoIdentity(file, fallbackName = '') {
  return {
    name: file?.name || fallbackName || '',
    size: Number(file?.size) || 0,
    lastModified: Number(file?.lastModified) || 0
  };
}

export function getAutoShotSignatureCacheKey(video, time) {
  return `${video?.name || ''}\u001f${Number(video?.size) || 0}\u001f${Number(video?.lastModified) || 0}\u001f${Math.round(Number(time) * 1000)}`;
}

export function pruneAutoShotSignatureCache(cache, minTime) {
  cache?.forEach((value, key) => {
    if (Number(value?.time) < Number(minTime)) cache.delete(key);
  });
  return cache;
}

export function serializeAutoShotSegmentState(state, video, defaults = {}) {
  if (!state?.active) return null;
  return {
    active: true,
    start: Number(state.start) || 0,
    end: Number(state.end) || 0,
    cursor: Number(state.cursor) || 0,
    diff: Number(state.diff) || Number(defaults.autoShotDiff) || 0,
    minGap: Number(state.minGap) || Number(defaults.autoShotMinGap) || 0,
    completed: !!state.completed,
    video: { ...video }
  };
}

export function restoreAutoShotSegmentState(storedState, currentVideo, videoDuration, fallbackEnd = 0, defaults = {}) {
  if (!storedState || storedState.active !== true) return null;
  const storedVideo = storedState.video || {};
  if (storedVideo.name && currentVideo?.name && storedVideo.name !== currentVideo.name) return null;
  if (storedVideo.size && currentVideo?.size && Number(storedVideo.size) !== Number(currentVideo.size)) return null;
  if (storedVideo.lastModified && currentVideo?.lastModified && Number(storedVideo.lastModified) !== Number(currentVideo.lastModified)) return null;
  const duration = Number(videoDuration) || Number(fallbackEnd) || 0;
  const start = Math.max(0, Number(storedState.start) || 0);
  const end = Math.max(start, Math.min(duration || Number(storedState.end) || 0, Number(storedState.end) || fallbackEnd || 0));
  const cursor = Math.max(start, Math.min(end, Number(storedState.cursor) || start));
  if (!(end > start)) return null;
  return {
    active: true,
    start,
    end,
    cursor,
    diff: Number(storedState.diff) || Number(defaults.autoShotDiff) || 0,
    minGap: Number(storedState.minGap) || Number(defaults.autoShotMinGap) || 0,
    completed: !!storedState.completed || cursor >= end - 0.001
  };
}

export function resetAutoShotSegmentState() {
  return { active: false, start: 0, end: 0, cursor: 0, diff: null, minGap: null, completed: false };
}

export function completeAutoShotSegment(state, segmentEnd) {
  const cursor = Number(segmentEnd) || state.cursor;
  return {
    ...state,
    cursor,
    completed: cursor >= state.end - 0.001
  };
}
