import {
  dbSaveShotGroups,
  dbSaveShots,
  dbSaveShotsIncremental
} from '../../platform/indexeddb.js';

export function saveProjectShots(projectId, shots) {
  return dbSaveShots(projectId, shots);
}

export function saveProjectShotsIncremental(projectId, shots, deletedShotIds) {
  return dbSaveShotsIncremental(projectId, shots, deletedShotIds);
}

export function saveProjectShotGroups(projectId, groups) {
  return dbSaveShotGroups(projectId, groups);
}
