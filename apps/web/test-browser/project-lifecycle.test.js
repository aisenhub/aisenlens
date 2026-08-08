import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = process.env.AISENLENS_TEST_URL || 'http://127.0.0.1:4173';

test('creates and restores an empty browser project from the project library', { skip: !existsSync(chromePath) }, async () => {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.locator('#projectLibraryNew').click();
    await page.waitForURL(/\/editor\/\d+$/);
    await page.waitForFunction(() => document.querySelector('#projectTitleInput')?.value !== '无项目');
    const projectTitle = await page.locator('#projectTitleInput').inputValue();
    assert.ok(projectTitle.trim());
    await page.waitForFunction(() => {
      const button = document.querySelector('#videoEmpty .video-empty-action');
      return !!button && getComputedStyle(button).display !== 'none';
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(expected => document.querySelector('#projectTitleInput')?.value === expected, projectTitle);
  } finally {
    await context.close();
    await browser.close();
  }
});
