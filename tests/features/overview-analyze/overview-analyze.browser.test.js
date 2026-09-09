import assert from "node:assert/strict"
import test from "node:test"
import { browserPath, createProjectAndEnterEditor, evaluate, launchBrowser, until } from "../shot-calibration/calibration-browser-harness.js"

test("Overview / Analyze 在常用视口下保持可导航且研究入口可见", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId } = await launchBrowser(context, "overview-analyze")
  await createProjectAndEnterEditor(client, sessionId)
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await client.send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 500 }, sessionId)
    await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('总览')")), "工作台导航未加载")
    assert.equal(await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.includes('总览')); button?.click(); return Boolean(button) })()"), true)
    await until(async () => (await evaluate(client, sessionId, "new URL(location.href).searchParams.get('stage') === 'overview'")), `总览阶段未加载：${viewport.width}x${viewport.height}`)
    await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('全片结构与节奏')")), "总览内容未出现")
    assert.equal(await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.includes('深拆')); button?.click(); return Boolean(button) })()"), true)
    await until(async () => (await evaluate(client, sessionId, "new URL(location.href).searchParams.get('stage') === 'analyze'")), "深拆阶段未加载")
    await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('ANALYZE')")), "深拆内容未出现")
    assert.equal(await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === 'Shots'); button?.click(); return Boolean(button) })()"), true)
    await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('研究队列')")), "研究队列未出现")
  }
})

test("Sound 研究范围通过真实 IndexedDB 往返并在刷新后恢复 URL 目标", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId } = await launchBrowser(context, "overview-analyze-research-roundtrip")
  await createProjectAndEnterEditor(client, sessionId)
  await until(async () => (await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '深拆'); if (!button) return false; button.click(); return true })()")), "深拆入口未出现")
  await until(async () => (await evaluate(client, sessionId, "new URL(location.href).searchParams.get('stage') === 'analyze'")), "深拆阶段未加载")
  await until(async () => (await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === 'Sound'); if (!button) return false; button.click(); return true })()")), "Sound 入口未出现")
  await until(async () => (await evaluate(client, sessionId, "new URL(location.href).searchParams.get('view') === 'sound'")), "Sound 视图未加载")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('保存声音研究范围')")), "声音研究范围入口未出现")
  await evaluate(client, sessionId, "(() => { const inputs = [...document.querySelectorAll('input[type=number]')]; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set; if (!setter || inputs.length < 2) return false; setter.call(inputs[0], '1.25'); inputs[0].dispatchEvent(new Event('input', { bubbles: true })); setter.call(inputs[1], '2.75'); inputs[1].dispatchEvent(new Event('input', { bubbles: true })); const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.includes('保存声音研究范围')); button?.click(); return Boolean(button) })()")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('RANGE')")), "声音研究范围未创建")
  const range = await until(async () => await evaluate(client, sessionId, "new Promise((resolve) => { const request = indexedDB.open('aisenlens-projects'); request.onsuccess = () => { const database = request.result; const projectId = new URL(location.href).searchParams.get('project'); const result = database.transaction('research-ranges', 'readonly').objectStore('research-ranges').index('projectId').getAll(IDBKeyRange.only(projectId)); result.onsuccess = () => resolve(result.result[0] ?? null); result.onerror = () => resolve(null) }; request.onerror = () => resolve(null) })"), "研究范围未写入 IndexedDB", 20_000)
  assert.deepEqual({ startUs: range.startUs, endUs: range.endUs }, { startUs: 1_250_000, endUs: 2_750_000 })
  const projectId = await evaluate(client, sessionId, "new URL(location.href).searchParams.get('project')")
  await client.send("Page.navigate", { url: `http://127.0.0.1:${(await evaluate(client, sessionId, "location.port"))}/app?project=${projectId}&stage=analyze&view=sound&mode=range&scopeKind=saved-range&scopeId=${range.id}&fromUs=1250000&toUs=2750000&targetKind=range&targetId=${range.id}` }, sessionId)
  await until(async () => (await evaluate(client, sessionId, "location.pathname === '/app' && new URL(location.href).searchParams.get('targetId') !== null")), "刷新后的研究目标 URL 未恢复")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('ANALYZE') && document.body.innerText.includes('Sound')")), "刷新后的 Analyze 页面未加载", 20_000)
  const reloadedRange = await until(async () => await evaluate(client, sessionId, "new Promise((resolve) => { const request = indexedDB.open('aisenlens-projects'); request.onsuccess = () => { const database = request.result; const result = database.transaction('research-ranges', 'readonly').objectStore('research-ranges').get(new URL(location.href).searchParams.get('targetId')); result.onsuccess = () => resolve(result.result ?? null); result.onerror = () => resolve(null) }; request.onerror = () => resolve(null) })"), "刷新后研究范围未从 IndexedDB 恢复", 20_000)
  assert.deepEqual({ id: reloadedRange.id, startUs: reloadedRange.startUs, endUs: reloadedRange.endUs }, { id: range.id, startUs: 1_250_000, endUs: 2_750_000 })
})

test("研究队列在 1000/3000 镜头压力数据下保持有界 DOM", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId } = await launchBrowser(context, "overview-analyze-shot-pressure")
  await createProjectAndEnterEditor(client, sessionId)
  const projectId = await evaluate(client, sessionId, "new URL(location.href).searchParams.get('project')")
  for (const count of [1_000, 3_000]) {
    await evaluate(client, sessionId, `new Promise((resolve, reject) => { const request = indexedDB.open('aisenlens-projects'); request.onerror = () => reject(request.error); request.onsuccess = () => { const database = request.result; const transaction = database.transaction(['projects', 'shots'], 'readwrite'); const shotStore = transaction.objectStore('shots'); const cursorRequest = shotStore.index('projectId').openCursor(IDBKeyRange.only('${projectId}')); cursorRequest.onerror = () => reject(cursorRequest.error); cursorRequest.onsuccess = () => { const cursor = cursorRequest.result; if (cursor) { cursor.delete(); cursor.continue(); return; } const now = new Date().toISOString(); for (let index = 0; index < ${count}; index += 1) shotStore.put({ id: 'pressure-${count}-' + index, projectId: '${projectId}', order: index, startFrame: index * 10, endFrame: index * 10 + 10, status: 'draft', detection: { source: 'manual' }, primaryScreenshotId: null, screenshotIds: [], firstFrameScreenshotId: null, lastFrameScreenshotId: null, analysisFields: {}, description: '', notes: '', createdAt: now, updatedAt: now }); const projectRequest = transaction.objectStore('projects').get('${projectId}'); projectRequest.onsuccess = () => transaction.objectStore('projects').put({ ...projectRequest.result, shots: ${count}, updatedAt: now }); }; transaction.oncomplete = () => resolve(true); transaction.onerror = () => reject(transaction.error); } })`)
    await client.send("Page.navigate", { url: `http://127.0.0.1:${(await evaluate(client, sessionId, "location.port"))}/app?project=${projectId}&stage=analyze&view=shots` }, sessionId)
    await until(async () => (await evaluate(client, sessionId, `document.body.innerText.includes('${count}/${count}')`)), `${count} 镜头未加载`, 30_000)
    const bounded = await evaluate(client, sessionId, "({ rows: document.querySelectorAll('button[aria-label^=播放镜头]').length, videos: document.querySelectorAll('video').length, height: document.querySelectorAll('button[aria-label^=播放镜头]').length })")
    assert.ok(bounded.rows < 80, `${count} 镜头渲染了过多列表 DOM：${bounded.rows}`)
    assert.equal(bounded.videos, 1)
  }
})
