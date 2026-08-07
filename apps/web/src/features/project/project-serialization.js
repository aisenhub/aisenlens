import { createEntityId } from '../../utils/ids.js';
import { serializeShotForAutoSave } from '../../utils/shots.js';
import { CURRENT_PROJECT_FORMAT_VERSION } from './project-migrations.js';

export function buildProjectDocument({
  title = '',
  projectUuid = '',
  videoFileName = '',
  duration = 0,
  templateType = '',
  autoShotState = null,
  timelineViewState = null,
  updatedAt = new Date().toISOString()
} = {}) {
  return {
    formatVersion: CURRENT_PROJECT_FORMAT_VERSION,
    title,
    projectUuid,
    videoFileName,
    duration: Math.round(Number(duration) || 0),
    templateType,
    updatedAt,
    autoShotState,
    timelineViewState
  };
}

export function serializeProjectShots(entries = []) {
  return (Array.isArray(entries) ? entries : []).map(entry => (
    serializeShotForAutoSave(entry, () => createEntityId('shot'))
  ));
}

export function serializeProjectGroups(groups = []) {
  return (Array.isArray(groups) ? groups : []).map(group => ({
    id: group.id,
    title: group.title || '未命名镜头组',
    summary: group.summary || '',
    shotIds: [...(group.shotIds || [])],
    createdAt: group.createdAt || '',
    updatedAt: group.updatedAt || ''
  }));
}
