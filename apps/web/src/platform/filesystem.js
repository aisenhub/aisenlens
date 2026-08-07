const VIDEO_FILE_PATTERN = /\.(mp4|webm|ogg|mov|mkv|avi)$/i;

export async function pickProjectDirectory({ windowTarget = globalThis } = {}) {
  if (typeof windowTarget?.showDirectoryPicker !== 'function') {
    const error = new Error('Directory picker is not supported by this browser');
    error.name = 'NotSupportedError';
    throw error;
  }
  return windowTarget.showDirectoryPicker({ mode: 'readwrite' });
}

export async function pickVideoFile({ windowTarget = globalThis, documentTarget = globalThis.document } = {}) {
  if (typeof windowTarget?.showOpenFilePicker === 'function') {
    const [handle] = await windowTarget.showOpenFilePicker({
      types: [{ description: 'Video files', accept: { 'video/*': ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi'] } }]
    });
    return handle.getFile();
  }
  return new Promise((resolve, reject) => {
    const input = documentTarget?.createElement?.('input');
    if (!input) return reject(new Error('File picker is unavailable'));
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = () => resolve(input.files?.[0] || null);
    input.click();
  });
}

export async function resolveVideoFileFromDir(dirHandle, preferredFileName = '') {
  let resolvedName = preferredFileName;
  let resolvedFile = null;
  if (preferredFileName) {
    try {
      const preferredHandle = await dirHandle.getFileHandle(preferredFileName);
      resolvedFile = await preferredHandle.getFile();
      return { file: resolvedFile, fileName: preferredFileName };
    } catch (_) {}
  }
  try {
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file' && VIDEO_FILE_PATTERN.test(name)) {
        resolvedFile = await handle.getFile();
        resolvedName = name;
        break;
      }
    }
  } catch (_) {}
  return { file: resolvedFile, fileName: resolvedName };
}

export function projectDirHandleKey(projectId, projectUuid) {
  return `projectDirHandle:${projectUuid || projectId}`;
}

export async function writeTextFile(dirHandle, fileName, content) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function readTextFile(dirHandle, fileName) {
  try {
    const fileHandle = await dirHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (_) {
    return null;
  }
}

export async function readBinaryFile(dirHandle, fileName) {
  try {
    const fileHandle = await dirHandle.getFileHandle(fileName);
    return await fileHandle.getFile();
  } catch (_) {
    return null;
  }
}

export async function writeBinaryFile(dirHandle, fileName, data) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

export async function copyVideoToProjectFolder(file, dirHandle) {
  if (!file || !dirHandle) return false;
  try {
    const existingHandle = await dirHandle.getFileHandle(file.name);
    const existingFile = await existingHandle.getFile();
    if (existingFile.size === file.size && existingFile.lastModified === file.lastModified) return true;
  } catch (_) {}
  try {
    await writeBinaryFile(dirHandle, file.name, file);
    return true;
  } catch (error) {
    console.warn('Video copy failed:', error);
    return false;
  }
}
