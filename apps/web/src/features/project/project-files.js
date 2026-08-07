import { dbGetSetting, dbSetSetting } from '../../platform/indexeddb.js';
import {
  projectDirHandleKey,
  readTextFile,
  resolveVideoFileFromDir
} from '../../platform/filesystem.js';

export async function saveProjectDirectoryHandle(dirHandle, projectId, projectUuid = null) {
  if (!dirHandle || !projectId) return;
  const keys = [...new Set([
    projectDirHandleKey(projectId, projectUuid),
    projectDirHandleKey(projectId, null)
  ])];
  await Promise.all(keys.map(key => dbSetSetting(key, dirHandle)));
}

export async function restoreProjectVideoFile(project) {
  if (!project || !project.id) return null;
  const storedHandle = await dbGetSetting(projectDirHandleKey(project.id, project.projectUuid))
    || await dbGetSetting(projectDirHandleKey(project.id, null));
  const dirHandle = storedHandle;
  if (!dirHandle || dirHandle.kind !== 'directory') return null;
  let permission = typeof dirHandle.queryPermission === 'function'
    ? await dirHandle.queryPermission({ mode: 'read' })
    : 'granted';
  if (permission !== 'granted' && typeof dirHandle.requestPermission === 'function') {
    try { permission = await dirHandle.requestPermission({ mode: 'read' }); } catch (_) { permission = 'denied'; }
  }
  if (permission !== 'granted') return null;
  const resolved = await resolveVideoFileFromDir(dirHandle, project.videoFileName || '');
  if (!resolved.file) return null;
  return { ...resolved, dirHandle };
}

export function resolveProjectVideoFile(dirHandle, preferredFileName = '') {
  return resolveVideoFileFromDir(dirHandle, preferredFileName);
}

const VIDEO_FILE_PATTERN = /\.(mp4|webm|ogg|mov|mkv|avi)$/i;

export async function removeProjectDirectoryResources(projectId, projectUuid = null) {
  const result = { removed: [], skipped: [], reason: '' };
  if (!projectId) return result;
  let directory = null;
  try {
    const storedHandle = await dbGetSetting(projectDirHandleKey(projectId, projectUuid))
      || await dbGetSetting(projectDirHandleKey(projectId, null));
    directory = storedHandle;
    if (!directory || directory.kind !== 'directory') return result;
    let permission = typeof directory.queryPermission === 'function'
      ? await directory.queryPermission({ mode: 'readwrite' })
      : 'granted';
    if (permission !== 'granted' && typeof directory.requestPermission === 'function') {
      try { permission = await directory.requestPermission({ mode: 'readwrite' }); } catch (_) { permission = 'denied'; }
    }
    if (permission !== 'granted') {
      result.reason = 'permission';
      result.skipped.push('project-directory');
      return result;
    }
    const manifestText = await readTextFile(directory, 'manifest.json');
    const projectText = await readTextFile(directory, 'project.json');
    let manifest = {};
    let project = {};
    try { manifest = manifestText ? JSON.parse(manifestText) : {}; } catch (_) {}
    try { project = projectText ? JSON.parse(projectText) : {}; } catch (_) {}
    const videoFileName = String(project.videoFileName || '');
    const files = new Set(['manifest.json', 'project.json', 'shots.json', 'groups.json', 'resource-index.json']);
    (Array.isArray(manifest.files) ? manifest.files : []).forEach(fileName => {
      const name = String(fileName || '').replace(/^[/\\]+/, '');
      if (name && !name.includes('..') && !name.includes('\\')) files.add(name);
    });
    for (const fileName of files) {
      if (fileName === videoFileName || VIDEO_FILE_PATTERN.test(fileName) || fileName.startsWith('screenshots/')) {
        result.skipped.push(fileName);
        continue;
      }
      try {
        await directory.removeEntry(fileName);
        result.removed.push(fileName);
      } catch (error) {
        if (error?.name !== 'NotFoundError') result.skipped.push(fileName);
      }
    }
    try {
      await directory.removeEntry('screenshots', { recursive: true });
      result.removed.push('screenshots/');
    } catch (error) {
      if (error?.name !== 'NotFoundError') result.skipped.push('screenshots/');
    }
  } catch (error) {
    result.reason = error?.name || 'cleanup-failed';
    result.skipped.push('project-directory');
  }
  return result;
}
