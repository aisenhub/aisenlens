import { createEntityId } from '../../utils/ids.js';
import { isPersistentScreenshot } from '../../utils/screenshot.js';

function parseCustomFields(value) {
  if (typeof value !== 'string') return value && typeof value === 'object' ? value : {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

export function normalizeProjectShot(record = {}, createShotId = () => createEntityId('shot')) {
  return {
    shotNumber: Number(record.shotNumber) || 0,
    shotId: record.shotId || createShotId(),
    time: Number(record.start_time) || 0,
    timecode: String(record.timecode || ''),
    image: isPersistentScreenshot(record.image) ? record.image : '',
    imageThumbnail: isPersistentScreenshot(record.imageThumbnail) ? record.imageThumbnail : '',
    width: Number(record.width) || 0,
    height: Number(record.height) || 0,
    shotSize: record.shotSize || '',
    cameraMove: record.cameraMove || '',
    analysis: record.analysis || '',
    custom: parseCustomFields(record.custom),
    duration: Number(record.duration) || 0,
    durationSec: Number(record.durationSec) || 0,
    durationText: record.durationText || '',
    lastFrameImage: isPersistentScreenshot(record.lastFrameImage) ? record.lastFrameImage : '',
    lastFrameThumbnail: isPersistentScreenshot(record.lastFrameThumbnail) ? record.lastFrameThumbnail : ''
  };
}

export function normalizeProjectShots(records = [], createShotId) {
  return (Array.isArray(records) ? records : []).map(record => normalizeProjectShot(record, createShotId));
}

export function normalizeProjectGroup(group = {}, createGroupId = () => createEntityId('group')) {
  return {
    id: String(group.id || createGroupId()),
    title: String(group.title || ''),
    summary: String(group.summary || ''),
    shotIds: Array.isArray(group.shotIds) ? group.shotIds.map(String) : [],
    createdAt: group.createdAt || '',
    updatedAt: group.updatedAt || ''
  };
}

export function normalizeProjectGroups(groups = [], createGroupId) {
  return (Array.isArray(groups) ? groups : []).map(group => normalizeProjectGroup(group, createGroupId));
}
