import assert from "node:assert/strict"
import test from "node:test"
import { browserPath, createProjectAndEnterEditor, evaluate, launchBrowser, until, wait } from "../shot-calibration/calibration-browser-harness.js"

test("Sound 研究范围通过真实 IndexedDB 往返并在刷新后恢复 URL 目标", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId } = await launchBrowser(context, "overview-analyze-research-roundtrip")
  await createProjectAndEnterEditor(client, sessionId)
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('总览')")), "工作台导航未加载")
  await until(async () => (await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '深拆'); if (!button) return false; button.click(); return true })()")), "深拆入口未出现")
  await until(async () => (await evaluate(client, sessionId, "new URL(location.href).searchParams.get('stage') === 'analyze'")), "深拆阶段未加载")
  await until(async () => (await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === 'Sound'); if (!button) return false; button.click(); return true })()")), "Sound 入口未出现")
  await until(async () => (await evaluate(client, sessionId, "new URL(location.href).searchParams.get('view') === 'sound'")), "Sound 视图未加载")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('保存声音研究范围')")), "声音研究范围入口未出现")
  await evaluate(client, sessionId, "(() => { const inputs = [...document.querySelectorAll('input[type=number]')]; const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set; if (!setter || inputs.length < 2) return false; setter.call(inputs[0], '1.25'); inputs[0].dispatchEvent(new Event('input', { bubbles: true })); inputs[0].dispatchEvent(new Event('change', { bubbles: true })); setter.call(inputs[1], '2.75'); inputs[1].dispatchEvent(new Event('input', { bubbles: true })); inputs[1].dispatchEvent(new Event('change', { bubbles: true })); return true })()")
  await until(async () => (await evaluate(client, sessionId, "[...document.querySelectorAll('input[type=number]')].slice(0, 2).every((input) => ['1.25', '2.75'].includes(input.value))")), "声音研究范围输入未更新")
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.includes('保存声音研究范围')); button?.click(); return Boolean(button) })()")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('RANGE')")), "声音研究范围未创建")
  const range = await until(async () => await evaluate(client, sessionId, "new Promise((resolve) => { let done = false; const finish = (value) => { if (done) return; done = true; resolve(value) }; setTimeout(() => finish({ __error: 'indexeddb-read-timeout' }), 2000); try { const request = indexedDB.open('aisenlens-projects'); request.onsuccess = () => { try { const database = request.result; const projectId = new URL(location.href).searchParams.get('project'); const result = database.transaction('research-ranges', 'readonly').objectStore('research-ranges').index('projectId').getAll(IDBKeyRange.only(projectId)); result.onsuccess = () => finish(result.result[0] ?? null); result.onerror = () => finish({ __error: String(result.error ?? 'range-read-error') }) } catch (error) { finish({ __error: String(error) }) } }; request.onerror = () => finish({ __error: String(request.error ?? 'database-open-error') }); request.onblocked = () => finish({ __error: 'database-open-blocked' }) } catch (error) { finish({ __error: String(error) }) } })"), "研究范围未写入 IndexedDB", 20_000)
  await wait(50)
  assert.equal(range?.__error, undefined, range?.__error)
  assert.deepEqual({ startUs: range.startUs, endUs: range.endUs }, { startUs: 1_250_000, endUs: 2_750_000 })
  const projectId = await evaluate(client, sessionId, "new URL(location.href).searchParams.get('project')")
  const navigationUrl = `http://127.0.0.1:${(await evaluate(client, sessionId, "location.port"))}/app?project=${projectId}&stage=analyze&view=sound&mode=range&scopeKind=saved-range&scopeId=${range.id}&fromUs=1250000&toUs=2750000&targetKind=range&targetId=${range.id}`
  void client.send("Page.navigate", { url: navigationUrl }, sessionId).catch(() => undefined)
  await until(async () => (await evaluate(client, sessionId, "location.pathname === '/app' && new URL(location.href).searchParams.get('targetId') !== null")), "刷新后的研究目标 URL 未恢复")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('ANALYZE') && document.body.innerText.includes('Sound')")), "刷新后的 Analyze 页面未加载", 20_000)
  const reloadedRange = await until(async () => await evaluate(client, sessionId, "new Promise((resolve) => { let done = false; const finish = (value) => { if (done) return; done = true; resolve(value) }; setTimeout(() => finish({ __error: 'indexeddb-reload-timeout' }), 2000); try { const request = indexedDB.open('aisenlens-projects'); request.onsuccess = () => { try { const database = request.result; const result = database.transaction('research-ranges', 'readonly').objectStore('research-ranges').get(new URL(location.href).searchParams.get('targetId')); result.onsuccess = () => finish(result.result ?? null); result.onerror = () => finish({ __error: String(result.error ?? 'range-reload-error') }) } catch (error) { finish({ __error: String(error) }) } }; request.onerror = () => finish({ __error: String(request.error ?? 'database-open-error') }); request.onblocked = () => finish({ __error: 'database-open-blocked' }) } catch (error) { finish({ __error: String(error) }) } })"), "刷新后研究范围未从 IndexedDB 恢复", 20_000)
  assert.equal(reloadedRange?.__error, undefined, reloadedRange?.__error)
  assert.deepEqual({ id: reloadedRange.id, startUs: reloadedRange.startUs, endUs: reloadedRange.endUs }, { id: range.id, startUs: 1_250_000, endUs: 2_750_000 })
})
