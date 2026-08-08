import { projectStorageService } from '../../platform/project-storage-service.js';
import { removeProjectScreenshotAssets } from '../screenshots/screenshot-assets.js';
import { removeProjectMedia } from './project-media.js';

export function createProjectRecord({ title, videoFileName = '', duration = 0, templateType, projectUuid } = {}) {
  return projectStorageService.createProject(title, videoFileName, duration, templateType, projectUuid);
}

export function getProjectRecord(projectId) {
  return projectStorageService.getProject(projectId);
}

export function updateProjectRecord(projectId, updates) {
  return projectStorageService.updateProject(projectId, updates);
}

export async function deleteProjectRecord(projectId) {
  const cleanup = await Promise.allSettled([
    removeProjectMedia(projectId),
    removeProjectScreenshotAssets(projectId)
  ]);
  await projectStorageService.deleteProject(projectId);
  const failed = cleanup.find(result => result.status === 'rejected');
  if (failed) throw failed.reason;
  return true;
}

export function getProjectBundle(projectId) {
  return projectStorageService.getProjectBundle(projectId);
}

export function findProjectByUuid(projectUuid) {
  return projectStorageService.findProjectByUuid(projectUuid);
}
