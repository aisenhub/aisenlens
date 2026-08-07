export function createShotEditorDraft(entry, defaultLastTime) {
  return {
    shotNumber: entry.shotNumber,
    startTime: Number(entry.time) || 0,
    endTime: defaultLastTime,
    firstTime: Number(entry.time) || 0,
    lastTime: defaultLastTime,
    firstImage: entry.image || '',
    firstThumbnail: entry.imageThumbnail || '',
    lastImage: entry.lastFrameImage || '',
    lastThumbnail: entry.lastFrameThumbnail || '',
    firstWidth: Number(entry.width) || 0,
    firstHeight: Number(entry.height) || 0,
    lastWidth: 0,
    lastHeight: 0
  };
}

export function getShotEditorNavigation(entries = [], draft = null) {
  const ordered = [...entries].sort((first, second) => first.shotNumber - second.shotNumber);
  const index = draft ? ordered.findIndex(item => item.shotNumber === draft.shotNumber) : -1;
  return {
    ordered,
    index,
    isFirstShot: index === 0,
    canGoPrevious: index > 0,
    canGoNext: index >= 0 && index < ordered.length - 1
  };
}

export function canEditShotEditorFirstTime(entries = [], draft = null) {
  return getShotEditorNavigation(entries, draft).isFirstShot;
}

export function updateShotEditorFrameDraft(draft, type, time, frame = null) {
  if (!draft) return draft;
  draft[`${type}Time`] = time;
  if (frame) {
    draft[`${type}Image`] = frame.image || '';
    draft[`${type}Thumbnail`] = frame.thumbnail || '';
    draft[`${type}Width`] = Number(frame.width) || 0;
    draft[`${type}Height`] = Number(frame.height) || 0;
  }
  return draft;
}
