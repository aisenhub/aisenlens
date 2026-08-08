import { dbGetMediaAsset, dbGetScreenshotAssets } from './indexeddb.js';
import { loadProjectVideo } from '../features/project/project-media.js';
import { loadProjectScreenshotAssets } from '../features/screenshots/screenshot-assets.js';

export const PROJECT_BACKUP_FORMAT = 'aisenlens-project';
export const PROJECT_BACKUP_FORMAT_VERSION = 1;

const asJsonText = value => JSON.stringify(value, null, 2);

const asArrayBuffer = async value => {
  if (value && typeof value.arrayBuffer === 'function') return value.arrayBuffer();
  return value;
};

const toSafePath = value => {
  const path = String(value || '');
  if (!path || path.startsWith('/') || path.includes('..') || path.includes('\\')) {
    throw new Error('Invalid project backup resource path');
  }
  return path;
};

const readJson = async (zip, path) => {
  const entry = zip.file(path);
  if (!entry) throw new Error(`Project backup is missing ${path}`);
  return JSON.parse(await entry.async('string'));
};

function createInvalidBackupError(message) {
  const error = new Error(message);
  error.code = 'PROJECT_BACKUP_INVALID';
  return error;
}

export function createProjectBackupService({
  getProject,
  getProjectBundle,
  getMediaAsset = dbGetMediaAsset,
  getScreenshotAssets = dbGetScreenshotAssets,
  loadVideo = loadProjectVideo,
  loadScreenshots = loadProjectScreenshotAssets,
  loadZip = async () => {
    const module = await import('jszip');
    return module.default || module;
  }
} = {}) {
  const exportProject = async (projectId, { mode = 'full' } = {}) => {
    if (!projectId) throw new Error('Project id is required');
    const project = await getProject?.(projectId);
    if (!project) throw new Error('Project not found');
    const bundle = await getProjectBundle?.(projectId) || { shots: [], groups: [] };
    const zip = new (await loadZip())();
    const includeVideo = mode === 'full';
    const includeScreenshots = mode === 'full' || mode === 'screenshots';
    const resources = [];

    zip.file('project.json', asJsonText(project));
    zip.file('shots.json', asJsonText(bundle.shots || []));
    zip.file('groups.json', asJsonText(bundle.groups || []));

    const mediaAsset = await getMediaAsset(projectId, 'video');
    zip.file('media-assets.json', asJsonText(mediaAsset ? [mediaAsset] : []));
    if (includeVideo && mediaAsset) {
      const loadedVideo = await loadVideo(projectId);
      if (loadedVideo?.file) {
        const path = `resources/media/${toSafePath(mediaAsset.resourceName || `${mediaAsset.id}.bin`)}`;
        zip.file(path, await asArrayBuffer(loadedVideo.file));
        resources.push({ type: 'video', path, assetId: mediaAsset.id, size: loadedVideo.file.size, mimeType: loadedVideo.file.type || mediaAsset.mimeType || '' });
      }
    }

    const screenshotMetadata = await getScreenshotAssets(projectId) || [];
    zip.file('screenshot-assets.json', asJsonText(screenshotMetadata));
    if (includeScreenshots && screenshotMetadata.length) {
      const loadedScreenshots = await loadScreenshots(projectId) || [];
      const byKey = new Map(loadedScreenshots.map(asset => [String(asset.key), asset]));
      for (const metadata of screenshotMetadata) {
        const asset = byKey.get(String(metadata.key));
        if (!asset?.blob) continue;
        const path = `resources/screenshots/${toSafePath(metadata.resourceName || `asset-${encodeURIComponent(String(metadata.key))}.bin`)}`;
        zip.file(path, await asArrayBuffer(asset.blob));
        resources.push({ type: 'screenshot', path, assetKey: metadata.key, shotId: metadata.shotId, size: asset.blob.size, mimeType: asset.blob.type || '' });
      }
    }

    zip.file('manifest.json', asJsonText({
      app: 'AisenLens',
      format: PROJECT_BACKUP_FORMAT,
      formatVersion: PROJECT_BACKUP_FORMAT_VERSION,
      projectUuid: project.projectUuid || '',
      projectTitle: project.title || '',
      mode,
      files: ['project.json', 'shots.json', 'groups.json', 'media-assets.json', 'screenshot-assets.json'],
      resources,
      updatedAt: project.updatedAt || new Date().toISOString(),
      exportedAt: new Date().toISOString()
    }));
    return zip.generateAsync({ type: 'blob' });
  };

  const importProject = async blob => {
    if (!blob) throw new Error('Project backup file is required');
    const Zip = await loadZip();
    const zip = await Zip.loadAsync(await asArrayBuffer(blob));
    const manifest = await readJson(zip, 'manifest.json');
    if (manifest?.app !== 'AisenLens' || manifest?.format !== PROJECT_BACKUP_FORMAT) {
      throw createInvalidBackupError('Unsupported AisenLens project backup');
    }
    if (Number(manifest.formatVersion) !== PROJECT_BACKUP_FORMAT_VERSION) {
      throw createInvalidBackupError(`Unsupported project backup version: ${manifest.formatVersion}`);
    }
    const project = await readJson(zip, 'project.json');
    const shots = await readJson(zip, 'shots.json');
    const groups = await readJson(zip, 'groups.json');
    const mediaAssets = await readJson(zip, 'media-assets.json');
    const screenshotAssets = await readJson(zip, 'screenshot-assets.json');
    if (!project || typeof project !== 'object' || !Array.isArray(shots) || !Array.isArray(groups) || !Array.isArray(mediaAssets) || !Array.isArray(screenshotAssets)) {
      throw createInvalidBackupError('Project backup contains invalid structured data');
    }
    const resources = [];
    for (const resource of Array.isArray(manifest.resources) ? manifest.resources : []) {
      const path = toSafePath(resource.path);
      const entry = zip.file(path);
      if (!entry) throw createInvalidBackupError(`Project backup is missing resource ${path}`);
      resources.push({ ...resource, path, blob: await entry.async('blob') });
    }
    return { manifest, project, shots, groups, mediaAssets, screenshotAssets, resources };
  };

  return { exportProject, importProject };
}

export const projectBackupService = createProjectBackupService();
