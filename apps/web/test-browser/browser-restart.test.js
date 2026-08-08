import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = process.env.AISENLENS_TEST_URL || 'http://127.0.0.1:4173';

test('restores a project after a complete browser restart', { skip: !existsSync(chromePath) }, async () => {
  const userDataDir = await mkdtemp(join(tmpdir(), 'aisenlens-browser-test-'));
  let context;
  try {
    context = await chromium.launchPersistentContext(userDataDir, { executablePath: chromePath, headless: true });
    let page = context.pages()[0] || await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.locator('#projectLibraryNew').click();
    await page.waitForURL(/\/editor\/\d+$/);
    await page.waitForFunction(() => {
      const value = document.querySelector('#projectTitleInput')?.value?.trim();
      return Boolean(value && value !== '无项目');
    });
    const title = await page.locator('#projectTitleInput').inputValue();
    const editorPath = page.url();
    assert.ok(title.trim());

    await context.close();
    context = await chromium.launchPersistentContext(userDataDir, { executablePath: chromePath, headless: true });
    page = context.pages()[0] || await context.newPage();
    await page.goto(editorPath, { waitUntil: 'networkidle' });
    await page.waitForFunction(expected => document.querySelector('#projectTitleInput')?.value === expected, title);
  } finally {
    await context?.close();
    await rm(userDataDir, { recursive: true, force: true, maxRetries: 3 });
  }
});
