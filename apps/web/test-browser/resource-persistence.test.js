import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = process.env.AISENLENS_TEST_URL || 'http://127.0.0.1:4173';

test('persists video and screenshot resources through browser OPFS across a reload', { skip: !existsSync(chromePath) }, async () => {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    const projectId = await page.evaluate(async () => {
      const { dbCreateProject } = await import('/src/platform/indexeddb.js');
      const { mediaResourceStore } = await import('/src/platform/media-resource-store.js');
      const { screenshotResourceStore } = await import('/src/platform/screenshot-resource-store.js');
      const id = await dbCreateProject('Resource test', 'clip.mp4', 1, 'default', 'browser-resource-test');
      await mediaResourceStore.saveVideo(id, new File(['video-data'], 'clip.mp4', { type: 'video/mp4', lastModified: 1 }));
      await screenshotResourceStore.save(id, [{ key: `${id}:shot-1:first`, shotId: 'shot-1', type: 'first', blob: new Blob(['image-data'], { type: 'image/png' }) }]);
      return id;
    });

    await page.reload({ waitUntil: 'networkidle' });
    const restored = await page.evaluate(async id => {
      const { mediaResourceStore } = await import('/src/platform/media-resource-store.js');
      const { screenshotResourceStore } = await import('/src/platform/screenshot-resource-store.js');
      const video = await mediaResourceStore.loadVideo(id);
      const screenshots = await screenshotResourceStore.load(id);
      return {
        videoName: video?.file?.name || null,
        videoBody: video ? await video.file.text() : null,
        screenshotBody: screenshots[0] ? await screenshots[0].blob.text() : null
      };
    }, projectId);

    assert.deepEqual(restored, { videoName: 'clip.mp4', videoBody: 'video-data', screenshotBody: 'image-data' });

    const cleared = await page.evaluate(async id => {
      const { dbGetMediaAsset, dbGetScreenshotAssets } = await import('/src/platform/indexeddb.js');
      const { mediaResourceStore } = await import('/src/platform/media-resource-store.js');
      const { screenshotResourceStore } = await import('/src/platform/screenshot-resource-store.js');
      await mediaResourceStore.removeProject(id);
      await screenshotResourceStore.removeProject(id);
      return {
        media: await dbGetMediaAsset(id),
        screenshots: await dbGetScreenshotAssets(id)
      };
    }, projectId);
    assert.deepEqual(cleared, { media: null, screenshots: [] });
  } finally {
    await context.close();
    await browser.close();
  }
});
