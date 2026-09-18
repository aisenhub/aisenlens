import assert from "node:assert/strict"
import test from "node:test"
import { browserPath, createProjectAndEnterEditor, evaluate, launchBrowser, until } from "../shot-calibration/calibration-browser-harness.js"

test("研究队列在 1000/3000 镜头压力数据下保持有界 DOM", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId } = await launchBrowser(context, "overview-analyze-shot-pressure")
  await createProjectAndEnterEditor(client, sessionId)
  const projectId = await evaluate(client, sessionId, "new URL(location.href).searchParams.get('project')")
  for (const count of [1_000, 3_000]) {
    await evaluate(client, sessionId, `new Promise((resolve, reject) => {
      const request = indexedDB.open('aisenlens-projects')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const database = request.result
        const writeBatch = (start) => {
          const end = Math.min(start + 250, ${count})
          const now = new Date().toISOString()
          const transaction = database.transaction('shots', 'readwrite')
          const shotStore = transaction.objectStore('shots')
          for (let index = start; index < end; index += 1) shotStore.put({ id: 'pressure-${count}-' + index, projectId: '${projectId}', order: index, startFrame: index * 10, endFrame: index * 10 + 10, status: 'draft', detection: { source: 'manual' }, primaryScreenshotId: null, screenshotIds: [], firstFrameScreenshotId: null, lastFrameScreenshotId: null, revision: 1, structureRevision: 1, lineage: { origin: 'manual', parentShotIds: [] }, createdAt: now, updatedAt: now })
          transaction.oncomplete = () => {
            if (end < ${count}) {
              setTimeout(() => writeBatch(end), 0)
              return
            }
            const update = database.transaction('projects', 'readwrite')
            const projectRequest = update.objectStore('projects').get('${projectId}')
            projectRequest.onsuccess = () => update.objectStore('projects').put({ ...projectRequest.result, shots: ${count}, updatedAt: now })
            update.oncomplete = () => { database.close(); resolve(true) }
            update.onerror = () => reject(update.error)
          }
          transaction.onerror = () => reject(transaction.error)
        }
        const clear = database.transaction('shots', 'readwrite')
        const cursorRequest = clear.objectStore('shots').index('projectId').openCursor(IDBKeyRange.only('${projectId}'))
        cursorRequest.onerror = () => reject(cursorRequest.error)
        cursorRequest.onsuccess = () => { const cursor = cursorRequest.result; if (cursor) { cursor.delete(); cursor.continue() } }
        clear.oncomplete = () => writeBatch(0)
        clear.onerror = () => reject(clear.error)
      }
    })`)
    const navigationUrl = `http://127.0.0.1:${(await evaluate(client, sessionId, "location.port"))}/app?project=${projectId}&workspace=analysis&view=shots`
    void client.send("Page.navigate", { url: navigationUrl }, sessionId).catch(() => undefined)
    await until(async () => (await evaluate(client, sessionId, `document.body.innerText.includes('${count}/${count}')`)), `${count} 镜头未加载`, 30_000)
    const bounded = await evaluate(client, sessionId, "({ rows: document.querySelectorAll('button[aria-label^=播放镜头]').length, videos: document.querySelectorAll('video').length, height: document.querySelectorAll('button[aria-label^=播放镜头]').length })")
    assert.ok(bounded.rows < 80, `${count} 镜头渲染了过多列表 DOM：${bounded.rows}`)
    assert.equal(bounded.videos, 1)
  }
})
