import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';

globalThis.IDBKeyRange = IDBKeyRange;
globalThis.indexedDB = indexedDB;

const {
  DB_NAME,
  dbCreateProject,
  dbDeleteMediaAssets,
  dbDeleteProject,
  dbDeleteScreenshotAssets,
  dbGetAllProjects,
  dbGetDatabaseMigrationLogs,
  dbGetMediaAsset,
  dbGetProject,
  dbGetScreenshotAssets,
  dbGetShotGroups,
  dbGetShots,
  dbPruneScreenshotAssets,
  dbSaveMediaAsset,
  dbSaveScreenshotAssets,
  dbSaveShotGroups,
  dbSaveShotsIncremental,
  dbUpdateProject
} = await import('../src/platform/indexeddb.js');

function deleteDatabase(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function createVersionFiveDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 5);
    request.onupgradeneeded = () => {
      const database = request.result;
      database.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
      const shots = database.createObjectStore('shots', { keyPath: 'id', autoIncrement: true });
      shots.createIndex('projectId', 'projectId');
      shots.createIndex('projectShotId', ['projectId', 'shotId'], { unique: true });
      const groups = database.createObjectStore('shotGroups', { keyPath: 'id' });
      groups.createIndex('projectId', 'projectId');
      database.createObjectStore('settings', { keyPath: 'key' });
      const screenshots = database.createObjectStore('screenshotAssets', { keyPath: 'key' });
      screenshots.createIndex('projectId', 'projectId');
      screenshots.createIndex('shotId', 'shotId');
      const media = database.createObjectStore('mediaAssets', { keyPath: 'id' });
      media.createIndex('projectId', 'projectId');
      media.createIndex('projectKind', ['projectId', 'kind'], { unique: true });
      screenshots.put({ key: 'legacy-ready', projectId: 1, storage: 'opfs', resourceName: 'ready.bin' });
      media.put({ id: 'legacy-failed', projectId: 1, kind: 'video', storage: 'opfs' });
    };
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

test('IndexedDB stores projects and upserts incremental shots', async () => {
  const projectId = await dbCreateProject('Demo', 'clip.mp4', 12, 'default', 'project-indexeddb-1');
  await dbUpdateProject(projectId, { title: 'Updated' });
  assert.equal((await dbGetProject(projectId)).title, 'Updated');

  assert.deepEqual(
    await dbSaveShotsIncremental(projectId, [{ shotId: 'shot-1', text: 'first' }, { shotId: 'shot-2', text: 'second' }]),
    { upserted: 2, deleted: 0 }
  );
  assert.deepEqual(
    await dbSaveShotsIncremental(projectId, [{ shotId: 'shot-1', text: 'revised' }], ['shot-2']),
    { upserted: 1, deleted: 1 }
  );
  assert.deepEqual((await dbGetShots(projectId)).map(shot => [shot.shotId, shot.text]), [['shot-1', 'revised']]);
});

test('IndexedDB writes, prunes and deletes screenshot metadata', async () => {
  const projectId = await dbCreateProject('Screenshots', '', 0, 'default', 'project-indexeddb-2');
  await dbSaveScreenshotAssets(projectId, [
    { key: '2:shot-1:first', shotId: 'shot-1', type: 'first', resourceName: 'first.bin', size: 1 },
    { key: '2:shot-2:last', shotId: 'shot-2', type: 'last', resourceName: 'last.bin', size: 2 }
  ]);
  assert.equal((await dbGetScreenshotAssets(projectId)).length, 2);
  await dbSaveScreenshotAssets(projectId, [{ key: '2:shot-1:first', shotId: 'shot-1', type: 'first', resourceName: 'revised.bin', size: 3 }]);
  assert.equal((await dbGetScreenshotAssets(projectId)).find(asset => asset.key === '2:shot-1:first').resourceName, 'revised.bin');
  assert.equal(await dbPruneScreenshotAssets(projectId, ['shot-1']), 1);
  assert.deepEqual((await dbGetScreenshotAssets(projectId)).map(asset => asset.shotId), ['shot-1']);
  assert.equal(await dbDeleteScreenshotAssets(projectId, ['shot-1']), 1);
  assert.deepEqual(await dbGetScreenshotAssets(projectId), []);
});

test('IndexedDB stores and deletes media metadata by project and kind', async () => {
  const projectId = await dbCreateProject('Media', '', 0, 'default', 'project-indexeddb-3');
  await dbSaveMediaAsset({ id: 'media-1', projectId, kind: 'video', resourceName: 'video.bin', status: 'ready' });
  assert.equal((await dbGetMediaAsset(projectId)).resourceName, 'video.bin');
  assert.equal(await dbDeleteMediaAssets(projectId), 1);
  assert.equal(await dbGetMediaAsset(projectId), null);
  await assert.rejects(dbSaveMediaAsset({ projectId, kind: 'video' }), /Media asset metadata is required/);
});

test('IndexedDB lists projects and returns missing records as empty values', async () => {
  const projectId = await dbCreateProject('Listed', '', 0, 'default', 'project-indexeddb-5');
  const projects = await dbGetAllProjects();

  assert.equal(projects.some(project => project.id === projectId && project.title === 'Listed'), true);
  assert.equal(await dbGetProject(999999), undefined);
  assert.equal(await dbGetMediaAsset(0), null);
});

test('deleting a project removes its shots, groups and screenshot metadata', async () => {
  const projectId = await dbCreateProject('Delete', '', 0, 'default', 'project-indexeddb-4');
  await dbSaveShotsIncremental(projectId, [{ shotId: 'shot-1' }]);
  await dbSaveShotGroups(projectId, [{ id: `group-${projectId}`, name: 'Group' }]);
  await dbSaveScreenshotAssets(projectId, [{ key: `${projectId}:shot-1:first`, shotId: 'shot-1', type: 'first', resourceName: 'first.bin' }]);

  await dbDeleteProject(projectId);
  assert.equal(await dbGetProject(projectId), undefined);
  assert.deepEqual(await dbGetShots(projectId), []);
  assert.deepEqual(await dbGetShotGroups(projectId), []);
  assert.deepEqual(await dbGetScreenshotAssets(projectId), []);
});

test('migrates legacy resource metadata and records incomplete resources', async () => {
  const { openDB, resetDatabaseConnectionForTests } = await import('../src/platform/indexeddb.js');
  resetDatabaseConnectionForTests();
  await deleteDatabase(DB_NAME);
  await createVersionFiveDatabase();
  await openDB();

  const screenshot = (await dbGetScreenshotAssets(1))[0];
  const media = await dbGetMediaAsset(1);
  const logs = await dbGetDatabaseMigrationLogs();
  assert.equal(screenshot.status, 'ready');
  assert.equal(media, null);
  assert.equal(logs.at(-1).version, 6);
  assert.equal(logs.at(-1).failedAssets, 1);
});
