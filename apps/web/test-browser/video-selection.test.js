import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = process.env.AISENLENS_TEST_URL || 'http://127.0.0.1:4173';

async function createRecordedVideo(page, frameDuration = 120) {
  return page.evaluate(async frameDurationMs => {
    if (typeof MediaRecorder !== 'function') return false;
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const context = canvas.getContext('2d');
    const stream = canvas.captureStream(10);
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
    const finished = new Promise((resolve, reject) => {
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = resolve;
      recorder.onerror = () => reject(recorder.error || new Error('MediaRecorder failed'));
    });
    recorder.start();
    const track = stream.getVideoTracks()[0];
    for (const color of ['#d00', '#06c', '#0a0', '#f5b700', '#111']) {
      context.fillStyle = color;
      context.fillRect(0, 0, 16, 16);
      track.requestFrame?.();
      await new Promise(resolve => setTimeout(resolve, frameDurationMs));
    }
    recorder.stop();
    await finished;
    window.__aisenlensTestVideo = new File([new Blob(chunks, { type: 'video/webm' })], 'recorded.webm', {
      type: 'video/webm',
      lastModified: 1
    });
    return window.__aisenlensTestVideo.size > 0;
  }, frameDuration);
}

async function openEmptyProject(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('#projectLibraryNew').click();
  await page.waitForURL(/\/editor\/\d+$/);
  await page.waitForFunction(() => document.querySelector('#projectTitleInput')?.value !== '无项目');
}

test('loads a video into the current project and stores its media resource', { skip: !existsSync(chromePath) }, async testContext => {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, 'showOpenFilePicker', {
      configurable: true,
      value: async () => [{ getFile: async () => window.__aisenlensTestVideo }]
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  try {
    await openEmptyProject(page);
    if (!await createRecordedVideo(page)) {
      testContext.skip('Current Chromium does not support MediaRecorder test video generation');
      return;
    }
    await page.locator('#videoEmpty .video-empty-action').click();
    await page.waitForFunction(() => document.querySelector('#toolVideo')?.src.startsWith('blob:'));

    const media = await page.evaluate(async () => {
      const { dbGetAllProjects } = await import('/src/platform/indexeddb.js');
      const { mediaResourceStore } = await import('/src/platform/media-resource-store.js');
      const [project] = await dbGetAllProjects();
      const video = project ? await mediaResourceStore.loadVideo(project.id) : null;
      return { name: video?.file?.name || null, size: video?.file?.size || 0 };
    });
    assert.equal(media.name, 'recorded.webm');
    assert.ok(media.size > 0);
  } finally {
    await context.close();
    await browser.close();
  }
});

test('detects shots after loading a video into an existing project', { skip: !existsSync(chromePath) }, async testContext => {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(window, 'showOpenFilePicker', {
      configurable: true,
      value: async () => [{ getFile: async () => window.__aisenlensTestVideo }]
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  try {
    await openEmptyProject(page);
    if (!await createRecordedVideo(page, 220)) {
      testContext.skip('Current Chromium does not support MediaRecorder test video generation');
      return;
    }
    await page.locator('#videoEmpty .video-empty-action').click();
    await page.waitForFunction(() => {
      const video = document.querySelector('#toolVideo');
      return !document.querySelector('#autoShotBtnMeta')?.disabled && Number(video?.duration) > 0;
    });
    await page.locator('#autoShotBtnMeta').click();
    await page.locator('#rangeModal.show').waitFor({ state: 'visible' });
    await page.locator('#rangeAutoShotDiff').fill('10');
    await page.locator('#rangeAutoShotMinGap').fill('0.1');
    await page.locator('#rangeModal .btn-confirm').click();
    await page.waitForFunction(() => document.querySelector('.auto-shot-segment-card')?.classList.contains('is-running'));
    await page.waitForFunction(() => {
      const card = document.querySelector('.auto-shot-segment-card');
      return !!card && !card.classList.contains('is-running') && !document.querySelector('#autoShotBtnMeta')?.disabled;
    });
    let result = { shots: 0, screenshots: 0 };
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      result = await page.evaluate(async () => {
        const { dbGetAllProjects, dbGetShots, dbGetScreenshotAssets } = await import('/src/platform/indexeddb.js');
        const projectId = Number(location.pathname.match(/\/editor\/(\d+)/)?.[1]);
        const project = (await dbGetAllProjects()).find(item => item.id === projectId);
        const shots = project ? await dbGetShots(project.id) : [];
        return {
          shots: shots.length,
          screenshots: project ? (await dbGetScreenshotAssets(project.id)).length : 0
        };
      });
      if (result.shots > 0 && result.screenshots > 0) break;
      await page.waitForTimeout(100);
    }
    assert.ok(result.shots > 0);
    assert.ok(result.screenshots > 0);
  } finally {
    await context.close();
    await browser.close();
  }
});
