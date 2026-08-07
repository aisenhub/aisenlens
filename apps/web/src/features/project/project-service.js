import {
  dbCreateProject,
  dbGetAllProjects,
  dbGetProject,
  dbGetShotGroups,
  dbGetShots,
  dbUpdateProject,
  dbDeleteProject,
  dbDeleteSetting
} from '../../platform/indexeddb.js';
import { projectDirHandleKey } from '../../platform/filesystem.js';
import { removeProjectScreenshotAssets } from '../screenshots/screenshot-assets.js';
import { removeProjectDirectoryResources } from './project-files.js';

export function createProjectRecord({ title, videoFileName = '', duration = 0, templateType, projectUuid } = {}) {
  return dbCreateProject(title, videoFileName, duration, templateType, projectUuid);
}

export function getProjectRecord(projectId) {
  return dbGetProject(projectId);
}

export function updateProjectRecord(projectId, updates) {
  return dbUpdateProject(projectId, updates);
}

export async function deleteProjectRecord(projectId) {
  const project = await dbGetProject(projectId);
  await removeProjectDirectoryResources(projectId, project?.projectUuid);
  await dbDeleteProject(projectId);
  await removeProjectScreenshotAssets(projectId);
  await Promise.all([
    dbDeleteSetting(projectDirHandleKey(projectId, project?.projectUuid)),
    dbDeleteSetting(projectDirHandleKey(projectId, null))
  ]);
  return true;
}

export async function getProjectBundle(projectId) {
  const [shots, groups] = await Promise.all([
    dbGetShots(projectId),
    dbGetShotGroups(projectId)
  ]);
  return { shots, groups };
}

export async function findProjectByUuid(projectUuid) {
  if (!projectUuid) return null;
  const projects = await dbGetAllProjects();
  return projects.find(project => project.projectUuid && project.projectUuid === projectUuid) || null;
}
