import assert from "node:assert/strict"
import test from "node:test"
import { createProjectAndEnterEditor, evaluate, launchBrowser, until, browserPath } from "../shot-calibration/calibration-browser-harness.js"

test("语义时间线展示注册轨道并持久化自由文本标记", { timeout: 90_000 }, async (context) => {
  if (!browserPath) { context.skip("未找到 Chrome/Edge；可设置 AISENLENS_CHROME_PATH 后重试。"); return }
  const { client, sessionId } = await launchBrowser(context, "timeline-semantic")
  await createProjectAndEnterEditor(client, sessionId)
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('准备')")), "编辑器导航未加载")
  await until(async () => (await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.offsetParent !== null && element.textContent?.trim() === '深拆'); if (!button) return false; button.click(); return true })()")), "深拆入口未出现")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('ANALYZE') && document.querySelector('[aria-label=\"项目时间轴\"]') !== null")), "语义时间线未加载")

  await until(async () => (await evaluate(client, sessionId, "document.querySelector('[aria-label=\"时间轴控制栏\"]') !== null")), "时间轴控制栏未加载")
  const timelineControlLabels = await evaluate(client, sessionId, "[...document.querySelector('[aria-label=\"时间轴控制栏\"]')?.querySelectorAll('button') ?? []].map((button) => button.getAttribute('aria-label'))")
  assert.deepEqual(timelineControlLabels, ['撤销', '重做', '缩小时间轴', '放大时间轴', '适配全片'])

  const tracks = await evaluate(client, sessionId, "['段落', '序列', '场景', '视觉主轨', '标记', '音频'].map((label) => ({ label, visible: document.body.innerText.includes(label) }))")
  assert.deepEqual(tracks, tracks.map((track) => ({ ...track, visible: true })))

  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.offsetParent !== null && element.textContent?.trim() === '标记'); button?.click(); return Boolean(button) })()")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('添加标记')")), "标记工具未打开")
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.offsetParent !== null && element.textContent?.trim() === '添加标记'); button?.click(); const textarea = document.querySelector('textarea[placeholder^=\"记录你注意到\"]'); if (!textarea) return false; textarea.focus(); return true })()")
  await client.send("Input.insertText", { text: "浏览器回归标记" }, sessionId)
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('保存') && document.querySelector('textarea')?.value === '浏览器回归标记'")), "标记编辑器未接受输入")
  await evaluate(client, sessionId, "(() => { const textarea = document.querySelector('textarea[placeholder^=\"记录你注意到\"]'); const form = textarea?.parentElement?.parentElement; const button = [...(form?.querySelectorAll('button') ?? [])].find((element) => element.offsetParent !== null && element.textContent?.trim() === '保存'); button?.click(); return Boolean(button) })()")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('浏览器回归标记')")), "标记未保存到当前视图")
  await new Promise((resolve) => setTimeout(resolve, 900))
  await client.send("Page.reload", { ignoreCache: true }, sessionId)
  await until(async () => (await evaluate(client, sessionId, "location.pathname === '/app' && document.body.innerText.includes('项目库')")), "刷新后编辑器未恢复")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('准备')")), "刷新后编辑器导航未加载")
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.offsetParent !== null && element.textContent?.trim() === '深拆'); button?.click(); return Boolean(button) })()")
  await until(async () => (await evaluate(client, sessionId, "document.querySelector('[aria-label=\"项目时间轴\"]') !== null")), "刷新后时间线未恢复")
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.offsetParent !== null && element.textContent?.trim() === '标记'); button?.click(); return Boolean(button) })()")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('浏览器回归标记')")), "刷新后标记未恢复")
})
