import { isPersistentScreenshot } from './screenshot.js';

export const PROJECT_IMPORT_LIMITS = Object.freeze({
  maxJsonBytes: 16 * 1024 * 1024,
  maxShots: 10000,
  maxGroups: 1000,
  maxGroupShots: 10000,
  maxDepth: 12,
  maxTitleLength: 200,
  maxIdLength: 128,
  maxFileNameLength: 255,
  maxTemplateLength: 100,
  maxTimecodeLength: 64,
  maxShortTextLength: 200,
  maxAnalysisLength: 5000,
  maxCustomLength: 20000,
  maxImageLength: 12 * 1024 * 1024,
  maxThumbnailLength: 4 * 1024 * 1024
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function getTextByteLength(value) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value).length;
  return value.length * 2;
}

function getMaxDepth(value, depth = 0) {
  if (!value || typeof value !== 'object') return depth;
  return Math.max(depth, ...Object.values(value).map(child => getMaxDepth(child, depth + 1)));
}

function assertStringLength(value, maxLength, path) {
  if (typeof value === 'string' && value.length > maxLength) {
    throw new Error(`${path} exceeds the maximum length of ${maxLength}`);
  }
}

function assertImageLength(value, maxLength, path) {
  if (typeof value === 'string' && value.length > maxLength) {
    throw new Error(`${path} exceeds the maximum image size`);
  }
}

export function parseProjectImportJson(text, fileName) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error(`${fileName} is missing or empty`);
  }
  if (getTextByteLength(text) > PROJECT_IMPORT_LIMITS.maxJsonBytes) {
    throw new Error(`${fileName} exceeds the maximum size of 16 MB`);
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch (_) {
    throw new Error(`${fileName} contains invalid JSON`);
  }
  if (getMaxDepth(value) > PROJECT_IMPORT_LIMITS.maxDepth) {
    throw new Error(`${fileName} exceeds the maximum nesting depth`);
  }
  return value;
}

export function validateProjectImportManifest(manifest) {
  if (!isPlainObject(manifest)) throw new Error('manifest.json must contain an object');
  if (manifest.version !== 1) throw new Error('manifest.json.version is unsupported');
  if (manifest.projectFormatVersion !== undefined && (!Number.isInteger(manifest.projectFormatVersion) || manifest.projectFormatVersion < 1)) {
    throw new Error('manifest.json.projectFormatVersion is invalid');
  }
  if (manifest.resourceStorageVersion !== undefined && (!Number.isInteger(manifest.resourceStorageVersion) || manifest.resourceStorageVersion < 1)) {
    throw new Error('manifest.json.resourceStorageVersion is invalid');
  }
  if (!['saving', 'completed', 'failed'].includes(manifest.status)) {
    throw new Error('manifest.json.status is invalid');
  }
  if (manifest.status !== 'completed') {
    throw new Error(`项目文件夹保存未完成（状态：${manifest.status}），请重新保存或检查文件夹内容`);
  }
  assertStringLength(manifest.projectUuid || '', PROJECT_IMPORT_LIMITS.maxIdLength, 'manifest.json.projectUuid');
  return manifest;
}

export function validateProjectImportSchema(project, shots, groups) {
  if (!isPlainObject(project)) throw new Error('project.json must contain an object');
  if (getMaxDepth(project) > PROJECT_IMPORT_LIMITS.maxDepth) throw new Error('project.json exceeds the maximum nesting depth');
  if (!isNonEmptyString(project.title)) throw new Error('project.json.title is required');
  if (!isNonEmptyString(project.projectUuid)) throw new Error('project.json.projectUuid is required');
  if (typeof project.videoFileName !== 'string') throw new Error('project.json.videoFileName must be a string');
  if (!isNonNegativeNumber(project.duration)) throw new Error('project.json.duration must be a non-negative number');
  if (!isNonEmptyString(project.templateType)) throw new Error('project.json.templateType is required');
  if (!isNonEmptyString(project.updatedAt)) throw new Error('project.json.updatedAt is required');
  assertStringLength(project.title, PROJECT_IMPORT_LIMITS.maxTitleLength, 'project.json.title');
  assertStringLength(project.projectUuid, PROJECT_IMPORT_LIMITS.maxIdLength, 'project.json.projectUuid');
  assertStringLength(project.videoFileName, PROJECT_IMPORT_LIMITS.maxFileNameLength, 'project.json.videoFileName');
  assertStringLength(project.templateType, PROJECT_IMPORT_LIMITS.maxTemplateLength, 'project.json.templateType');
  assertStringLength(project.updatedAt, 64, 'project.json.updatedAt');
  if (project.autoShotState !== null && !isPlainObject(project.autoShotState)) {
    throw new Error('project.json.autoShotState must be an object or null');
  }
  if (project.autoShotState !== null) {
    const state = project.autoShotState;
    if (state.active !== true || typeof state.completed !== 'boolean') throw new Error('project.json.autoShotState flags are invalid');
    if (!isNonNegativeNumber(state.start) || !isNonNegativeNumber(state.end) || state.end < state.start) {
      throw new Error('project.json.autoShotState range is invalid');
    }
    if (!isNonNegativeNumber(state.cursor) || state.cursor < state.start || state.cursor > state.end) {
      throw new Error('project.json.autoShotState.cursor is invalid');
    }
    if (!isNonNegativeNumber(state.diff) || !isNonNegativeNumber(state.minGap)) {
      throw new Error('project.json.autoShotState settings are invalid');
    }
    if (!isPlainObject(state.video) || typeof state.video.name !== 'string' ||
        !isNonNegativeNumber(state.video.size) || !isNonNegativeNumber(state.video.lastModified)) {
      throw new Error('project.json.autoShotState.video is invalid');
    }
    assertStringLength(state.video.name, PROJECT_IMPORT_LIMITS.maxFileNameLength, 'project.json.autoShotState.video.name');
  }

  if (!Array.isArray(shots)) throw new Error('shots.json must contain an array');
  if (shots.length > PROJECT_IMPORT_LIMITS.maxShots) throw new Error('shots.json contains too many shots');
  const shotIds = new Set();
  const shotNumbers = new Set();
  shots.forEach((shot, index) => {
    const path = `shots.json[${index}]`;
    if (!isPlainObject(shot)) throw new Error(`${path} must be an object`);
    if (!Number.isInteger(shot.shotNumber) || shot.shotNumber < 0) throw new Error(`${path}.shotNumber is invalid`);
    if (shotNumbers.has(shot.shotNumber)) throw new Error(`${path}.shotNumber is duplicated`);
    shotNumbers.add(shot.shotNumber);
    if (!isNonEmptyString(shot.shotId)) throw new Error(`${path}.shotId is required`);
    assertStringLength(shot.shotId, PROJECT_IMPORT_LIMITS.maxIdLength, `${path}.shotId`);
    if (shotIds.has(shot.shotId)) throw new Error(`${path}.shotId is duplicated`);
    shotIds.add(shot.shotId);
    if (typeof shot.timecode !== 'string') throw new Error(`${path}.timecode must be a string`);
    assertStringLength(shot.timecode, PROJECT_IMPORT_LIMITS.maxTimecodeLength, `${path}.timecode`);
    if (!isNonNegativeNumber(shot.start_time) || !isNonNegativeNumber(shot.end_time) || shot.end_time < shot.start_time) {
      throw new Error(`${path} time range is invalid`);
    }
    ['shotSize', 'cameraMove', 'analysis', 'custom', 'image', 'imageThumbnail', 'durationText', 'lastFrameImage', 'lastFrameThumbnail'].forEach(field => {
      if (typeof shot[field] !== 'string') throw new Error(`${path}.${field} must be a string`);
    });
    assertStringLength(shot.shotSize, PROJECT_IMPORT_LIMITS.maxShortTextLength, `${path}.shotSize`);
    assertStringLength(shot.cameraMove, PROJECT_IMPORT_LIMITS.maxShortTextLength, `${path}.cameraMove`);
    assertStringLength(shot.analysis, PROJECT_IMPORT_LIMITS.maxAnalysisLength, `${path}.analysis`);
    assertStringLength(shot.durationText, PROJECT_IMPORT_LIMITS.maxTimecodeLength, `${path}.durationText`);
    assertStringLength(shot.custom, PROJECT_IMPORT_LIMITS.maxCustomLength, `${path}.custom`);
    assertImageLength(shot.image, PROJECT_IMPORT_LIMITS.maxImageLength, `${path}.image`);
    assertImageLength(shot.lastFrameImage, PROJECT_IMPORT_LIMITS.maxImageLength, `${path}.lastFrameImage`);
    assertImageLength(shot.imageThumbnail, PROJECT_IMPORT_LIMITS.maxThumbnailLength, `${path}.imageThumbnail`);
    assertImageLength(shot.lastFrameThumbnail, PROJECT_IMPORT_LIMITS.maxThumbnailLength, `${path}.lastFrameThumbnail`);
    if (!isNonNegativeNumber(shot.width) || !isNonNegativeNumber(shot.height)) {
      throw new Error(`${path} dimensions are invalid`);
    }
    if (!isNonNegativeNumber(shot.duration) || !isNonNegativeNumber(shot.durationSec)) {
      throw new Error(`${path} duration is invalid`);
    }
    try {
      const custom = JSON.parse(shot.custom);
      if (!isPlainObject(custom)) throw new Error();
      if (getMaxDepth(custom) > PROJECT_IMPORT_LIMITS.maxDepth) throw new Error();
    } catch (_) {
      throw new Error(`${path}.custom must be a JSON object string`);
    }
    ['image', 'imageThumbnail', 'lastFrameImage', 'lastFrameThumbnail'].forEach(field => {
      if (shot[field] && !isPersistentScreenshot(shot[field])) throw new Error(`${path}.${field} is not a supported image`);
    });
  });

  if (!Array.isArray(groups)) throw new Error('groups.json must contain an array');
  if (groups.length > PROJECT_IMPORT_LIMITS.maxGroups) throw new Error('groups.json contains too many groups');
  const groupIds = new Set();
  groups.forEach((group, index) => {
    const path = `groups.json[${index}]`;
    if (!isPlainObject(group)) throw new Error(`${path} must be an object`);
    if (!isNonEmptyString(group.id)) throw new Error(`${path}.id is required`);
    assertStringLength(group.id, PROJECT_IMPORT_LIMITS.maxIdLength, `${path}.id`);
    if (groupIds.has(group.id)) throw new Error(`${path}.id is duplicated`);
    groupIds.add(group.id);
    if (typeof group.title !== 'string' || typeof group.summary !== 'string') throw new Error(`${path} text fields are invalid`);
    assertStringLength(group.title, PROJECT_IMPORT_LIMITS.maxTitleLength, `${path}.title`);
    assertStringLength(group.summary, PROJECT_IMPORT_LIMITS.maxAnalysisLength, `${path}.summary`);
    if (!Array.isArray(group.shotIds)) throw new Error(`${path}.shotIds must be an array`);
    if (group.shotIds.length > PROJECT_IMPORT_LIMITS.maxGroupShots) throw new Error(`${path}.shotIds contains too many references`);
    const members = new Set();
    group.shotIds.forEach(shotId => {
      if (!isNonEmptyString(shotId) || !shotIds.has(shotId) || members.has(shotId)) {
        throw new Error(`${path}.shotIds contains an invalid reference`);
      }
      members.add(shotId);
    });
    if (typeof group.createdAt !== 'string' || typeof group.updatedAt !== 'string') throw new Error(`${path} timestamps are invalid`);
    assertStringLength(group.createdAt, 64, `${path}.createdAt`);
    assertStringLength(group.updatedAt, 64, `${path}.updatedAt`);
  });
}
