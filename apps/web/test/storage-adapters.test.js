import test from 'node:test';
import assert from 'node:assert/strict';
import { createMediaResourceStore } from '../src/platform/media-resource-store.js';
import { createOpfsStorage, requestStoragePersistence } from '../src/platform/opfs-storage.js';
import { createScreenshotResourceStore } from '../src/platform/screenshot-resource-store.js';

function notFound() {
  const error = new Error('Not found');
  error.name = 'NotFoundError';
  return error;
}

function createMemoryNavigator() {
  const createDirectory = () => {
    const directories = new Map();
    const files = new Map();
    return {
      kind: 'directory',
      directories,
      files,
      async getDirectoryHandle(name, { create = false } = {}) {
        if (!directories.has(name)) {
          if (!create) throw notFound();
          directories.set(name, createDirectory());
        }
        return directories.get(name);
      },
      async getFileHandle(name, { create = false } = {}) {
        if (!files.has(name)) {
          if (!create) throw notFound();
          files.set(name, null);
        }
        return {
          kind: 'file',
          createWritable: async () => ({
            write: async data => { files.set(name, data); },
            close: async () => {}
          }),
          getFile: async () => files.get(name)
        };
      },
      async removeEntry(name, { recursive = false } = {}) {
        if (files.delete(name)) return;
        const directory = directories.get(name);
        if (!directory) throw notFound();
        if (!recursive && (directory.files.size || directory.directories.size)) throw new Error('Directory is not empty');
        directories.delete(name);
      },
      async *entries() {
        for (const [name, directory] of directories) yield [name, directory];
        for (const name of files.keys()) yield [name, { kind: 'file' }];
      }
    };
  };

  const root = createDirectory();
  return {
    root,
    navigatorTarget: {
      storage: {
        getDirectory: async () => root,
        estimate: async () => ({ usage: 10, quota: 100 })
      }
    }
  };
}

async function getMemoryDirectory(root, path) {
  let directory = root;
  for (const segment of path) directory = await directory.getDirectoryHandle(segment);
  return directory;
}

test('OPFS adapter writes, lists, reads and removes files', async () => {
  const { navigatorTarget } = createMemoryNavigator();
  const storage = createOpfsStorage({ navigatorTarget });
  await storage.writeFile({ path: ['projects', '1'], fileName: 'clip.bin', data: new Blob(['video']) });

  assert.deepEqual(await storage.listDirectories(['projects']), ['1']);
  assert.equal(await (await storage.readFile({ path: ['projects', '1'], fileName: 'clip.bin' })).text(), 'video');
  assert.equal(await storage.removeFile({ path: ['projects', '1'], fileName: 'clip.bin' }), true);
  assert.equal(await storage.readFile({ path: ['projects', '1'], fileName: 'clip.bin' }), null);
  assert.equal(await storage.removeFile({ path: ['projects', '1'], fileName: 'clip.bin' }), false);
  assert.deepEqual(await storage.estimate(), { usage: 10, quota: 100, available: 90 });
});

test('OPFS adapter rejects path traversal and unsupported browsers', async () => {
  const { navigatorTarget } = createMemoryNavigator();
  const storage = createOpfsStorage({ navigatorTarget });
  await assert.rejects(storage.writeFile({ path: ['..'], fileName: 'clip.bin', data: new Blob() }), /Invalid OPFS directory path/);
  await assert.rejects(storage.writeFile({ path: ['projects'], fileName: '../clip.bin', data: new Blob() }), /Invalid OPFS file name/);
  await assert.rejects(createOpfsStorage({ navigatorTarget: {} }).readFile({ path: ['projects'], fileName: 'clip.bin' }), { name: 'NotSupportedError' });
});

test('storage persistence reports protected, declined and unavailable states', async () => {
  assert.deepEqual(await requestStoragePersistence({ storage: { persisted: async () => true, persist: async () => false } }), { status: 'protected', persisted: true });
  assert.deepEqual(await requestStoragePersistence({ storage: { persisted: async () => false, persist: async () => false } }), { status: 'unprotected', persisted: false });
  const failed = await requestStoragePersistence({ storage: { persisted: async () => { throw new Error('blocked'); }, persist: async () => true } });
  assert.equal(failed.status, 'unavailable');
});

test('screenshot resources roll back OPFS writes when metadata persistence fails', async () => {
  const { root, navigatorTarget } = createMemoryNavigator();
  let calls = 0;
  const statuses = [];
  const store = createScreenshotResourceStore({
    navigatorTarget,
    saveMetadata: async (_projectId, assets) => {
      calls += 1;
      statuses.push(assets[0].status);
      if (calls === 2) throw new Error('metadata unavailable');
    }
  });

  await assert.rejects(store.save(7, [{ key: '7:shot-1:first', blob: new Blob(['image']) }]), /metadata unavailable/);
  const directory = await getMemoryDirectory(root, ['projects', '7', 'screenshots']);
  assert.equal(directory.files.has('asset-7%3Ashot-1%3Afirst.bin'), false);
  assert.deepEqual(statuses, ['pending', 'ready', 'failed']);
});

test('screenshot removal clears OPFS resources even when metadata deletion fails', async () => {
  const { root, navigatorTarget } = createMemoryNavigator();
  const asset = { key: '7:shot-1:first', shotId: 'shot-1', blob: new Blob(['image']) };
  const store = createScreenshotResourceStore({
    navigatorTarget,
    saveMetadata: async (_projectId, assets) => assets,
    loadMetadata: async () => [{ ...asset, blob: null, storage: 'opfs', status: 'ready', resourceName: 'asset-7%3Ashot-1%3Afirst.bin' }],
    deleteMetadata: async () => { throw new Error('metadata unavailable'); }
  });
  await store.save(7, [asset]);

  await assert.rejects(store.remove(7, ['shot-1']), /metadata unavailable/);
  const directory = await getMemoryDirectory(root, ['projects', '7', 'screenshots']);
  assert.equal(directory.files.has('asset-7%3Ashot-1%3Afirst.bin'), false);
});

test('media resources reject insufficient browser quota before writing', async () => {
  const { root, navigatorTarget } = createMemoryNavigator();
  const store = createMediaResourceStore({
    navigatorTarget,
    getStorageEstimate: async () => ({ available: 9 }),
    storageReserveBytes: 0
  });

  const video = Object.assign(new Blob(['0123456789'], { type: 'video/mp4' }), { name: 'clip.mp4', lastModified: 1 });
  await assert.rejects(store.saveVideo(8, video), { code: 'STORAGE_QUOTA_LOW' });
  assert.equal(root.directories.has('projects'), false);
});

test('media resources roll back OPFS writes when metadata persistence fails', async () => {
  const { root, navigatorTarget } = createMemoryNavigator();
  const statuses = [];
  const store = createMediaResourceStore({
    navigatorTarget,
    createId: prefix => `${prefix}-1`,
    getStorageEstimate: async () => ({ available: Infinity }),
    getMetadata: async () => null,
    saveMetadata: (() => {
      let calls = 0;
      return async asset => {
        calls += 1;
        statuses.push(asset.status);
        if (calls === 2) throw new Error('metadata unavailable');
      };
    })()
  });
  const video = Object.assign(new Blob(['video'], { type: 'video/mp4' }), { name: 'clip.mp4', lastModified: 1 });

  await assert.rejects(store.saveVideo(8, video), /metadata unavailable/);
  const directory = await getMemoryDirectory(root, ['projects', '8', 'media']);
  assert.equal(directory.files.has('asset-media-file-1.bin'), false);
  assert.deepEqual(statuses, ['pending', 'ready', 'failed']);
});
