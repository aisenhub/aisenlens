import assert from "node:assert/strict"
import test from "node:test"
import { browserPath, evaluate, launchBrowser, until } from "../shot-calibration/calibration-browser-harness.js"
import { importRepository, navigateToProject, seedProject } from "./analysis-system-browser-harness.js"

test("P3 Focus/Batch 在宽、中、窄视口处理 IME、重复键与 Escape", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId, serverPort } = await launchBrowser(context, "analysis-system-responsive")
  const { projectId } = await seedProject(client, sessionId, 4)
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await client.send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 500 }, sessionId)
    await navigateToProject(client, sessionId, serverPort, projectId, "workspace=analysis&view=scenes")
    if (viewport.width <= 1100) {
      await until(async () => await evaluate(client, sessionId, "document.querySelector('.editor-workspace')?.getAttribute('data-mobile-panel') === 'analysis' || [...document.querySelectorAll('.editor-mobile-panel-switcher button')].some((element) => element.textContent?.trim() === '分析')"), `${viewport.width} 视口分析面板切换入口未出现`)
      const analysisPanelOpen = await evaluate(client, sessionId, "document.querySelector('.editor-workspace')?.getAttribute('data-mobile-panel') === 'analysis'")
      if (!analysisPanelOpen) await evaluate(client, sessionId, "[...document.querySelectorAll('.editor-mobile-panel-switcher button')].find((element) => element.textContent?.trim() === '分析')?.click()")
      await until(async () => await evaluate(client, sessionId, "document.querySelector('.editor-workspace')?.getAttribute('data-mobile-panel') === 'analysis'"), `${viewport.width} 视口分析面板未打开`)
    }
    await until(async () => await evaluate(client, sessionId, "[...document.querySelectorAll('button')].some((element) => element.textContent?.trim() === '维度' && element.getClientRects().length > 0)"), `${viewport.width} 视口维度面板未出现`)
    await evaluate(client, sessionId, "[...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '维度' && element.getClientRects().length > 0)?.click()")
    await until(async () => await evaluate(client, sessionId, "[...document.querySelectorAll('button')].some((element) => element.textContent?.trim() === '批量记录' && element.getClientRects().length > 0)"), `${viewport.width} 视口批量入口未出现`)
    await evaluate(client, sessionId, "[...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '批量记录' && element.getClientRects().length > 0)?.click()")
    await until(async () => await evaluate(client, sessionId, "document.querySelector('button[aria-label=\"关闭批量记录\"]') !== null"), `${viewport.width} 视口 Batch 面板未打开`)
    await evaluate(client, sessionId, "document.querySelector('button[aria-label=\"关闭批量记录\"]')?.click()")
    await navigateToProject(client, sessionId, serverPort, projectId, "workspace=analysis&view=shots&mode=sequential")
    await until(async () => await evaluate(client, sessionId, "new URL(location.href).searchParams.get('view') === 'shots'"), `${viewport.width} 视口 Shots 未加载`)
    await until(async () => await evaluate(client, sessionId, "[...document.querySelectorAll('button')].some((element) => element.textContent?.trim() === 'Focus' && element.getClientRects().length > 0)"), `${viewport.width} 视口 Focus 入口未出现`)
    await evaluate(client, sessionId, "[...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === 'Focus' && element.getClientRects().length > 0)?.click()")
    await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('FOCUS ANALYSIS')"), `${viewport.width} 视口 Focus 未打开`)
    const composingQueue = await evaluate(client, sessionId, "(() => { const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }); Object.defineProperty(event, 'isComposing', { value: true }); window.dispatchEvent(event); return document.body.innerText.match(/本轮队列[^\\n]*/)?.[0] ?? '' })()")
    assert.match(composingQueue, /1\/4/)
    const repeatQueue = await evaluate(client, sessionId, "(() => { const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, repeat: true }); window.dispatchEvent(event); return document.body.innerText.match(/本轮队列[^\\n]*/)?.[0] ?? '' })()")
    assert.match(repeatQueue, /1\/4/)
    await evaluate(client, sessionId, "document.activeElement?.blur(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))")
    await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('本轮队列 2/4')"), `${viewport.width} 视口正常方向键未推进 Focus`)
    await evaluate(client, sessionId, "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))")
    await until(async () => await evaluate(client, sessionId, "!document.body.innerText.includes('FOCUS ANALYSIS')"), `${viewport.width} 视口 Focus Escape 未关闭`)
  }
  await evaluate(client, sessionId, `import(${JSON.stringify(importRepository)}).then(({ default: repository }) => repository.deleteProject('${projectId}'))`)
})
