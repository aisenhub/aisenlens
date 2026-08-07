import { createEntityId } from '../../utils/ids.js';
import { formatTime } from '../../utils/time.js';

export function getNextShotNumber(entries = []) {
  return entries.length ? Math.max(...entries.map(entry => Number(entry.shotNumber) || 0)) + 1 : 1;
}

export function createShotEntry(time, variants = null, createShotId = () => createEntityId('shot')) {
  return {
    shotNumber: 0,
    shotId: createShotId(),
    time: Number(time) || 0,
    timecode: formatTime(time),
    image: variants ? variants.image : '',
    imageThumbnail: variants ? variants.thumbnail : '',
    width: variants ? variants.width : 0,
    height: variants ? variants.height : 0,
    shotSize: '',
    cameraMove: '',
    analysis: '',
    custom: {},
    duration: 0,
    durationText: ''
  };
}

export function normalizeShotOrder(entries = [], createShotId = () => createEntityId('shot')) {
  const ordered = [...entries].sort(
    (first, second) => (Number(first.time) || 0) - (Number(second.time) || 0)
  );
  ordered.forEach((entry, index) => {
    entry.shotNumber = index + 1;
    if (!entry.shotId) entry.shotId = createShotId();
  });
  return ordered;
}

export function findShotByNumber(entries = [], shotNumber) {
  return entries.find(entry => Number(entry.shotNumber) === Number(shotNumber)) || null;
}

export function removeShotByNumber(entries = [], shotNumber) {
  return entries.filter(entry => Number(entry.shotNumber) !== Number(shotNumber));
}
