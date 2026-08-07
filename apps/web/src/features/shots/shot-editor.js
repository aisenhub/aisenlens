import { createEntityId } from '../../utils/ids.js';
import { formatTime } from '../../utils/time.js';

export function applyShotEditorFrames(entry, startTime, endTime, firstFrame, lastFrame) {
  if (!entry) return entry;
  entry.time = startTime;
  entry.timecode = formatTime(startTime);
  if (firstFrame) {
    entry.image = firstFrame.image || entry.image;
    entry.imageThumbnail = firstFrame.thumbnail || entry.imageThumbnail || '';
    entry.width = firstFrame.width || entry.width || 0;
    entry.height = firstFrame.height || entry.height || 0;
  }
  if (lastFrame) {
    entry.lastFrameImage = lastFrame.image || entry.lastFrameImage;
    entry.lastFrameThumbnail = lastFrame.thumbnail || entry.lastFrameThumbnail || '';
  }
  entry.segmentEnd = endTime;
  return entry;
}

export function createSplitShotEntry(startTime, endTime, frame = null, createShotId = () => createEntityId('shot')) {
  return {
    shotNumber: 0,
    shotId: createShotId(),
    time: startTime,
    timecode: formatTime(startTime),
    image: frame ? frame.image : '',
    imageThumbnail: frame ? frame.thumbnail : '',
    width: frame ? frame.width : 0,
    height: frame ? frame.height : 0,
    shotSize: '',
    cameraMove: '',
    analysis: '',
    custom: {},
    duration: 0,
    durationText: '',
    segmentEnd: endTime
  };
}
