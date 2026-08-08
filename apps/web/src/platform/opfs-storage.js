export function supportsOpfs(navigatorTarget = globalThis.navigator) {
  return typeof navigatorTarget?.storage?.getDirectory === 'function';
}

export async function estimateStorage(navigatorTarget = globalThis.navigator) {
  if (typeof navigatorTarget?.storage?.estimate !== 'function') {
    return { usage: 0, quota: 0, available: Infinity };
  }
  const estimate = await navigatorTarget.storage.estimate();
  const usage = Number(estimate.usage) || 0;
  const quota = Number(estimate.quota) || 0;
  return { usage, quota, available: quota > 0 ? Math.max(0, quota - usage) : Infinity };
}

export async function requestStoragePersistence(navigatorTarget = globalThis.navigator) {
  const storage = navigatorTarget?.storage;
  if (typeof storage?.persisted !== 'function' || typeof storage?.persist !== 'function') {
    return { status: 'unsupported', persisted: false };
  }
  try {
    if (await storage.persisted()) return { status: 'protected', persisted: true };
    const persisted = await storage.persist();
    return persisted
      ? { status: 'protected', persisted: true }
      : { status: 'unprotected', persisted: false };
  } catch (error) {
    return { status: 'unavailable', persisted: false, error };
  }
}

function normalizePath(path = []) {
  if (!Array.isArray(path) || !path.length) throw new Error('OPFS directory path is required');
  return path.map(segment => {
    const value = String(segment || '');
    if (!value || value === '.' || value === '..' || value.includes('/') || value.includes('\\')) {
      throw new Error('Invalid OPFS directory path');
    }
    return value;
  });
}

function normalizeFileName(fileName) {
  const value = String(fileName || '');
  if (!value || value === '.' || value === '..' || value.includes('/') || value.includes('\\')) {
    throw new Error('Invalid OPFS file name');
  }
  return value;
}

function createUnsupportedError() {
  const error = new Error('This browser does not support Origin Private File System');
  error.name = 'NotSupportedError';
  return error;
}

export function createOpfsStorage({ navigatorTarget = globalThis.navigator } = {}) {
  let rootPromise = null;

  const getRoot = async () => {
    if (!supportsOpfs(navigatorTarget)) throw createUnsupportedError();
    if (!rootPromise) rootPromise = navigatorTarget.storage.getDirectory();
    return rootPromise;
  };

  const getDirectory = async (path, { create = true } = {}) => {
    const segments = normalizePath(path);
    let directory = await getRoot();
    for (const segment of segments) {
      directory = await directory.getDirectoryHandle(segment, { create });
    }
    return directory;
  };

  const writeFile = async ({ path, fileName, data }) => {
    if (data === null || data === undefined) throw new Error('OPFS file data is required');
    const directory = await getDirectory(path);
    const handle = await directory.getFileHandle(normalizeFileName(fileName), { create: true });
    const writable = await handle.createWritable();
    try {
      await writable.write(data);
    } finally {
      await writable.close();
    }
  };

  const readFile = async ({ path, fileName }) => {
    try {
      const directory = await getDirectory(path, { create: false });
      const handle = await directory.getFileHandle(normalizeFileName(fileName));
      return await handle.getFile();
    } catch (error) {
      if (error?.name === 'NotFoundError') return null;
      throw error;
    }
  };

  const removeFile = async ({ path, fileName }) => {
    try {
      const directory = await getDirectory(path, { create: false });
      await directory.removeEntry(normalizeFileName(fileName));
      return true;
    } catch (error) {
      if (error?.name === 'NotFoundError') return false;
      throw error;
    }
  };

  const removeDirectory = async ({ path, recursive = true }) => {
    const segments = normalizePath(path);
    const name = segments.pop();
    try {
      const parent = segments.length ? await getDirectory(segments, { create: false }) : await getRoot();
      await parent.removeEntry(name, { recursive });
      return true;
    } catch (error) {
      if (error?.name === 'NotFoundError') return false;
      throw error;
    }
  };

  const listDirectories = async path => {
    try {
      const directory = await getDirectory(path, { create: false });
      const names = [];
      for await (const [name, handle] of directory.entries()) {
        if (handle.kind === 'directory') names.push(name);
      }
      return names;
    } catch (error) {
      if (error?.name === 'NotFoundError') return [];
      throw error;
    }
  };

  return { getRoot, getDirectory, writeFile, readFile, removeFile, removeDirectory, listDirectories, estimate: () => estimateStorage(navigatorTarget) };
}
