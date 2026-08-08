import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import JSZip from 'jszip';
import { chromium } from 'playwright-core';

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = process.env.AISENLENS_TEST_URL || 'http://127.0.0.1:4173';
const projectUuid = 'browser-backup-import-test';

async function createBackup({ uuid = projectUuid, title = 'Imported browser project', includeResources = false } = {}) {
  const zip = new JSZip();
  const project = {
    formatVersion: 2,
    title,
    projectUuid: uuid,
    videoFileName: includeResources ? 'clip.mp4' : '',
    duration: includeResources ? 1 : 0,
    templateType: 'default',
    updatedAt: '2026-08-08T00:00:00.000Z',
    autoShotState: null
  };
  const shots = includeResources ? [{
    shotNumber: 1,
    shotId: 'shot-1',
    timecode: '00:00:00',
    start_time: 0,
    end_time: 0,
    shotSize: '',
    cameraMove: '',
    analysis: '',
    custom: '{}',
    image: '',
    imageThumbnail: '',
    durationText: '',
    lastFrameImage: '',
    lastFrameThumbnail: '',
    width: 0,
    height: 0,
    duration: 0,
    durationSec: 0
  }] : [];
  const mediaAssets = includeResources ? [{
    id: 'source-video',
    kind: 'video',
    resourceName: 'video.bin',
    originalName: 'clip.mp4',
    mimeType: 'video/mp4',
    size: 10,
    lastModified: 1
  }] : [];
  const screenshotAssets = includeResources ? [{
    key: 'source:shot-1:first',
    shotId: 'shot-1',
    type: 'first',
    resourceName: 'first.bin',
    size: 10,
    storage: 'opfs',
    status: 'ready'
  }] : [];
  const resources = includeResources ? [
    { type: 'video', path: 'resources/media/video.bin', assetId: 'source-video', size: 10, mimeType: 'video/mp4' },
    { type: 'screenshot', path: 'resources/screenshots/first.bin', assetKey: 'source:shot-1:first', shotId: 'shot-1', size: 10, mimeType: 'image/png' }
  ] : [];
  zip.file('manifest.json', JSON.stringify({
    app: 'AisenLens',
    format: 'aisenlens-project',
    formatVersion: 1,
    projectUuid: uuid,
    projectTitle: project.title,
    mode: includeResources ? 'full' : 'data',
    files: ['project.json', 'shots.json', 'groups.json', 'media-assets.json', 'screenshot-assets.json'],
    resources
  }));
  zip.file('project.json', JSON.stringify(project));
  zip.file('shots.json', JSON.stringify(shots));
  zip.file('groups.json', JSON.stringify([]));
  zip.file('media-assets.json', JSON.stringify(mediaAssets));
  zip.file('screenshot-assets.json', JSON.stringify(screenshotAssets));
  if (includeResources) {
    zip.file('resources/media/video.bin', 'video-data');
    zip.file('resources/screenshots/first.bin', 'image-data');
  }
  return zip.generateAsync({ type: 'nodebuffer' });
}

test('imports a project backup through the browser UI and restores it after reload', { skip: !existsSync(chromePath) }, async () => {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => consoleErrors.push(error.message));

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.locator('#projectLibraryImportInput').setInputFiles({
      name: 'project.aisenlens.zip',
      mimeType: 'application/zip',
      buffer: await createBackup()
    });
    await page.waitForURL(/\/editor\/\d+$/);
    await page.waitForFunction(expected => document.querySelector('#projectTitleInput')?.value === expected, 'Imported browser project');
    const importState = await page.evaluate(() => ({
      title: document.querySelector('#projectTitleInput')?.value,
      toasts: [...document.querySelectorAll('#toastContainer .toast')].map(toast => toast.textContent)
    }));
    assert.equal(importState.title, 'Imported browser project', `ZIP import did not activate the imported project: ${JSON.stringify({ importState, consoleErrors })}`);

    await page.reload({ waitUntil: 'networkidle' });
    const restored = await page.evaluate(async uuid => {
      const { dbGetAllProjects } = await import('/src/platform/indexeddb.js');
      const projects = await dbGetAllProjects();
      return projects.filter(project => project.projectUuid === uuid).map(project => project.title);
    }, projectUuid);
    assert.deepEqual(restored, ['Imported browser project']);
  } finally {
    await context.close();
    await browser.close();
  }
});

test('imports video and screenshot resources from a full backup and restores them after reload', { skip: !existsSync(chromePath) }, async () => {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const fullProjectUuid = 'browser-full-backup-import-test';
  const title = 'Imported full browser project';

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.locator('#projectLibraryImportInput').setInputFiles({
      name: 'full-project.aisenlens.zip',
      mimeType: 'application/zip',
      buffer: await createBackup({ uuid: fullProjectUuid, title, includeResources: true })
    });
    await page.waitForFunction(expected => document.querySelector('#projectTitleInput')?.value === expected, title);

    await page.reload({ waitUntil: 'networkidle' });
    const restored = await page.evaluate(async uuid => {
      const { dbGetAllProjects } = await import('/src/platform/indexeddb.js');
      const { mediaResourceStore } = await import('/src/platform/media-resource-store.js');
      const { screenshotResourceStore } = await import('/src/platform/screenshot-resource-store.js');
      const project = (await dbGetAllProjects()).find(item => item.projectUuid === uuid);
      const video = project ? await mediaResourceStore.loadVideo(project.id) : null;
      const screenshots = project ? await screenshotResourceStore.load(project.id) : [];
      return {
        title: project?.title || null,
        video: video ? await video.file.text() : null,
        screenshot: screenshots[0] ? await screenshots[0].blob.text() : null
      };
    }, fullProjectUuid);

    assert.deepEqual(restored, { title, video: 'video-data', screenshot: 'image-data' });
  } finally {
    await context.close();
    await browser.close();
  }
});

test('cleans up an imported project when browser video storage is insufficient', { skip: !existsSync(chromePath) }, async () => {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(navigator.storage, 'estimate', {
      configurable: true,
      value: async () => ({ usage: 0, quota: 1024 })
    });
  });
  const page = await context.newPage();
  const quotaProjectUuid = 'browser-quota-backup-import-test';

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.locator('#projectLibraryImportInput').setInputFiles({
      name: 'quota-project.aisenlens.zip',
      mimeType: 'application/zip',
      buffer: await createBackup({ uuid: quotaProjectUuid, title: 'Quota project', includeResources: true })
    });
    await page.waitForFunction(() => document.querySelector('#projectLibraryNotice')?.dataset.type === 'error');

    const residue = await page.evaluate(async uuid => {
      const { dbGetAllProjects } = await import('/src/platform/indexeddb.js');
      return (await dbGetAllProjects()).filter(project => project.projectUuid === uuid).length;
    }, quotaProjectUuid);
    assert.equal(residue, 0);
    assert.equal(await page.locator('#projectLibraryView').isVisible(), true);
  } finally {
    await context.close();
    await browser.close();
  }
});

test('cleans up an imported project when OPFS writing fails', { skip: !existsSync(chromePath) }, async () => {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(navigator.storage, 'getDirectory', {
      configurable: true,
      value: async () => { throw new DOMException('OPFS unavailable', 'UnknownError'); }
    });
  });
  const page = await context.newPage();
  const failedProjectUuid = 'browser-opfs-failure-backup-import-test';

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.locator('#projectLibraryImportInput').setInputFiles({
      name: 'opfs-failure-project.aisenlens.zip',
      mimeType: 'application/zip',
      buffer: await createBackup({ uuid: failedProjectUuid, title: 'OPFS failure project', includeResources: true })
    });
    await page.waitForFunction(() => document.querySelector('#projectLibraryNotice')?.dataset.type === 'error');

    const residue = await page.evaluate(async uuid => {
      const { dbGetAllProjects } = await import('/src/platform/indexeddb.js');
      return (await dbGetAllProjects()).filter(project => project.projectUuid === uuid).length;
    }, failedProjectUuid);
    assert.equal(residue, 0);
  } finally {
    await context.close();
    await browser.close();
  }
});
