import { normalizeProjectGroups, normalizeProjectShots } from './project-data.js';
import { migrateProjectBundle } from './project-migrations.js';
import {
  createProjectRecord,
  deleteProjectRecord,
  findProjectByUuid,
  updateProjectRecord
} from './project-service.js';
import { saveProjectVideo } from './project-media.js';
import { saveProjectScreenshotAssets } from '../screenshots/screenshot-assets.js';
import { saveProjectShotGroups, saveProjectShots } from '../shots/shot-persistence.js';
import { projectBackupService } from '../../platform/project-backup-service.js';
import { createProjectUuid } from '../../utils/ids.js';
import { validateProjectImportSchema } from '../../utils/project-schema.js';

export async function importProjectBackup(file) {
  const loaded = await projectBackupService.importProject(file);
  const migrated = migrateProjectBundle({ project: loaded.project, shots: loaded.shots, groups: loaded.groups });
  validateProjectImportSchema(migrated.project, migrated.shots, migrated.groups);
  if (await findProjectByUuid(migrated.project.projectUuid)) {
    const error = new Error('Project backup already exists');
    error.code = 'PROJECT_BACKUP_DUPLICATE';
    throw error;
  }

  const projectId = await createProjectRecord({
    title: migrated.project.title || '未命名项目',
    videoFileName: migrated.project.videoFileName || '',
    duration: migrated.project.duration || 0,
    templateType: migrated.project.templateType || 'Default',
    projectUuid: migrated.project.projectUuid || createProjectUuid()
  });
  try {
    await saveProjectShots(projectId, normalizeProjectShots(migrated.shots));
    await saveProjectShotGroups(projectId, normalizeProjectGroups(migrated.groups));
    const videoMetadata = loaded.mediaAssets.find(asset => asset?.kind === 'video');
    const videoResource = loaded.resources.find(resource => resource.type === 'video');
    if (videoMetadata && videoResource?.blob) {
      const videoFile = new File([videoResource.blob], videoMetadata.originalName || migrated.project.videoFileName || 'video', {
        type: videoMetadata.mimeType || videoResource.mimeType || videoResource.blob.type || 'application/octet-stream',
        lastModified: Number(videoMetadata.lastModified) || Date.now()
      });
      await saveProjectVideo(projectId, videoFile);
      await updateProjectRecord(projectId, { videoFileName: videoFile.name });
    }
    const resourcesByKey = new Map(loaded.resources.filter(resource => resource.type === 'screenshot').map(resource => [String(resource.assetKey), resource]));
    const screenshotAssets = loaded.screenshotAssets.map(asset => {
      const resource = resourcesByKey.get(String(asset.key));
      return resource?.blob ? { ...asset, key: `${Number(projectId)}:${String(asset.shotId)}:${String(asset.type)}`, blob: resource.blob } : null;
    }).filter(Boolean);
    if (screenshotAssets.length) await saveProjectScreenshotAssets(projectId, screenshotAssets);
    return projectId;
  } catch (error) {
    await deleteProjectRecord(projectId).catch(() => {});
    throw error;
  }
}
