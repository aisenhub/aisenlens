import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectBackupService } from '../src/platform/project-backup-service.js';

function createService() {
  return createProjectBackupService({
    getProject: async () => ({ id: 1, title: 'Demo', projectUuid: 'project-1', updatedAt: '2026-08-08T00:00:00.000Z' }),
    getProjectBundle: async () => ({ shots: [{ shotId: 'shot-1', start_time: 0 }], groups: [{ id: 'group-1', shotIds: ['shot-1'] }] }),
    getMediaAsset: async () => ({ id: 'video-1', resourceName: 'video.bin', mimeType: 'video/mp4', size: 3 }),
    getScreenshotAssets: async () => [{ key: '1:shot-1:first', shotId: 'shot-1', type: 'first', resourceName: 'first.bin', size: 2 }],
    loadVideo: async () => ({ file: new Blob(['abc'], { type: 'video/mp4' }) }),
    loadScreenshots: async () => [{ key: '1:shot-1:first', blob: new Blob(['xy'], { type: 'image/png' }) }]
  });
}

test('exports and imports a complete project backup', async () => {
  const service = createService();
  const backup = await service.exportProject(1, { mode: 'full' });
  const imported = await service.importProject(backup);

  assert.equal(imported.manifest.projectUuid, 'project-1');
  assert.equal(imported.project.title, 'Demo');
  assert.equal(imported.shots.length, 1);
  assert.equal(imported.groups.length, 1);
  assert.deepEqual(imported.resources.map(resource => resource.type).sort(), ['screenshot', 'video']);
});

test('data-only backups exclude binary resources', async () => {
  const service = createService();
  const backup = await service.exportProject(1, { mode: 'data' });
  const imported = await service.importProject(backup);

  assert.equal(imported.manifest.mode, 'data');
  assert.equal(imported.resources.length, 0);
  assert.equal(imported.mediaAssets.length, 1);
  assert.equal(imported.screenshotAssets.length, 1);
});

test('rejects an unsupported project backup version', async () => {
  const service = createService();
  const backup = await service.exportProject(1, { mode: 'data' });
  const bytes = await backup.arrayBuffer();
  const Zip = await import('jszip').then(module => module.default || module);
  const zip = await Zip.loadAsync(bytes);
  zip.file('manifest.json', JSON.stringify({ app: 'AisenLens', format: 'aisenlens-project', formatVersion: 2, resources: [] }));

  await assert.rejects(service.importProject(await zip.generateAsync({ type: 'blob' })), { code: 'PROJECT_BACKUP_INVALID' });
});
