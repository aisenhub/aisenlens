import { isPersistentScreenshot } from './screenshot.js';

export function getEntryThumbnail(entry) {
  return entry && (entry.imageThumbnail || entry.image) || '';
}

export function serializeShotForAutoSave(entry, createShotId) {
  const shot = entry || {};
  const startTime = Number(shot.time) || 0;
  const duration = Number(shot.duration) || 0;
  const shotId = String(shot.shotId || (typeof createShotId === 'function' ? createShotId() : ''));
  return {
    shotNumber: Number(shot.shotNumber) || 0,
    shotId,
    timecode: String(shot.timecode || ''),
    start_time: Number(startTime.toFixed(3)),
    end_time: Number(((Number.isFinite(duration) ? duration : 0) + startTime).toFixed(3)),
    shotSize: shot.shotSize || '',
    cameraMove: shot.cameraMove || '',
    analysis: shot.analysis || '',
    custom: JSON.stringify(shot.custom || {}),
    image: isPersistentScreenshot(shot.image) ? shot.image : '',
    imageThumbnail: isPersistentScreenshot(shot.imageThumbnail) ? shot.imageThumbnail : '',
    width: Number(shot.width) || 0,
    height: Number(shot.height) || 0,
    duration,
    durationSec: Number(shot.durationSec) || 0,
    durationText: shot.durationText || '',
    lastFrameImage: isPersistentScreenshot(shot.lastFrameImage) ? shot.lastFrameImage : '',
    lastFrameThumbnail: isPersistentScreenshot(shot.lastFrameThumbnail) ? shot.lastFrameThumbnail : ''
  };
}
