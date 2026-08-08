import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = process.env.AISENLENS_TEST_URL || 'http://127.0.0.1:4173';

test('opens the project library at the root route and edits a selected project title inline', { skip: !existsSync(chromePath) }, async () => {
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('#projectLibraryView').isVisible(), true);
    assert.equal(await page.locator('#editorShell').isVisible(), false);
    const projectId = await page.evaluate(async () => {
      const { dbCreateProject } = await import('/src/platform/indexeddb.js');
      return dbCreateProject('Library route project', '', 0, 'default', 'library-route-project');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#projectLibraryList').getByRole('button', { name: '打开工程' }).click();
    await page.waitForURL(new RegExp(`/editor/${projectId}$`));
    await page.waitForFunction(expected => document.querySelector('#projectTitleInput')?.value === expected, 'Library route project');

    await page.locator('#projectTitleInput').click();
    await page.locator('#projectTitleInput').fill('Renamed library route project');
    await page.locator('#projectTitleInput').press('Enter');
    await page.waitForFunction(expected => document.querySelector('#projectTitleInput')?.value === expected, 'Renamed library route project');

    await page.locator('#editorBackBtn').click();
    await page.waitForURL(/\/$/);
    assert.equal(await page.locator('#projectLibraryView').isVisible(), true, JSON.stringify(errors));
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('.project-library-delete').click();
    await page.waitForFunction(() => !document.querySelector('.project-library-card'));
    await page.reload({ waitUntil: 'networkidle' });
  } finally {
    await context.close();
    await browser.close();
  }
});
