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
