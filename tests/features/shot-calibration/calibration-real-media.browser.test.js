import assert from "node:assert/strict"
import test from "node:test"
import { chooseVideoFile, createProjectAndEnterEditor, evaluate, launchBrowser, openCalibration, until, browserPath, web } from "./calibration-browser-harness.js"
import { resolve } from "node:path"

test("真实 synthetic.webm 完成素材关联、PTS 校准、双帧检查与刷新恢复", { timeout: 180_000 }, async (context) => {
  if (!browserPath) { context.skip("未找到 Chrome/Edge；可设置 AISENLENS_CHROME_PATH 后重试。"); return }
  const browser = await launchBrowser(context, "calibration-real-media")
  const { client, sessionId } = browser
  const fixture = resolve(web, "test", "fixtures", "auto-shot", "synthetic.webm")

  await createProjectAndEnterEditor(client, sessionId)
  await chooseVideoFile(client, sessionId, fixture)
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('已关联，可用于播放与检测')")), "真实素材未完成关联", 60_000)
  await openCalibration(client, sessionId)
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('CFR') || document.body.innerText.includes('VFR') || document.body.innerText.includes('无法验证精确帧')")), "真实素材未完成 CFR/VFR/视频验证", 90_000)
  const calibrationStatus = await evaluate(client, sessionId, "document.body.innerText")
  assert.equal(calibrationStatus.includes('无法验证精确帧'), false, calibrationStatus)
  await until(async () => (await evaluate(client, sessionId, "document.querySelectorAll('video').length === 1")), "真实素材视频元素未出现", 10_000)
  const calibrationTimeline = await evaluate(client, sessionId, "(() => { const timeline = document.querySelector('[aria-label=\"校准时间轴\"]'); return { exists: Boolean(timeline), scopeControls: timeline?.querySelectorAll('button').length ?? 0, hasThumbnailImages: Boolean(timeline?.querySelector('img')) } })()")
  assert.equal(calibrationTimeline.exists, true)
  assert.equal(calibrationTimeline.hasThumbnailImages, false)
  assert.ok(calibrationTimeline.scopeControls >= 2)

  const metadata = await evaluate(client, sessionId, "(() => { const video = document.querySelector('video'); return { count: document.querySelectorAll('video').length, duration: video?.duration ?? 0, readyState: video?.readyState ?? 0 } })()")
  assert.equal(metadata.count, 1)
  assert.ok(metadata.duration > 12)
  assert.ok(metadata.readyState >= 1)

  await evaluate(client, sessionId, "(() => { const video = document.querySelector('video'); if (!video) return false; video.currentTime = 2.5; video.dispatchEvent(new Event('timeupdate', { bubbles: true })); return true })()")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('· 第 ') && (document.body.innerText.includes('CFR') || document.body.innerText.includes('VFR'))")), "播放头未按 PTS 定位", 10_000)
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.includes('在当前帧切开')); if (!button) return false; button.click(); return true })()")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('镜头 2')")), "当前帧补切未生成第二镜头", 15_000)
  await until(async () => (await evaluate(client, sessionId, "(() => { const button = document.querySelector('button[aria-label=\"定位镜头 1 的边界\"]'); if (!button) return false; button.click(); return true })()")), "左侧镜头列表未提供边界定位入口")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('结束边界')")), "点击左侧镜头后右侧未跳转到对应边界")

  await until(async () => (await evaluate(client, sessionId, "document.querySelector('[aria-label=\"边界双帧证据\"]')?.querySelectorAll('figure img').length === 2")), "双帧边界检查器未完成解码", 45_000)
  const pair = await evaluate(client, sessionId, "(() => { const panel = document.querySelector('[aria-label=\"边界双帧证据\"]'); return { figures: panel?.querySelectorAll('figure').length ?? 0, labels: panel?.textContent ?? '' } })()")
  assert.equal(pair.figures, 2)
  assert.ok(pair.labels.includes('前镜末帧'))
  assert.ok(pair.labels.includes('后镜首帧'))
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '前移一帧'); if (!button) return false; button.click(); return true })()")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('边界检查')")), "边界移动后检查器消失", 10_000)

  const beforeReloadUrl = await evaluate(client, sessionId, "location.href")
  assert.match(beforeReloadUrl, /[?&]project=/)
  await client.send("Page.reload", { ignoreCache: true }, sessionId)
  try {
    await until(async () => (await evaluate(client, sessionId, "location.pathname === '/app' && Boolean(document.body?.innerText.includes('镜头校准'))")), "刷新后未恢复编辑器", 45_000)
  } catch (error) {
    const afterReload = await evaluate(client, sessionId, "({ href: location.href, body: document.body?.innerText ?? '' })")
    throw new Error(`${error instanceof Error ? error.message : String(error)}; afterReload=${JSON.stringify(afterReload)}`)
  }
  await until(async () => (await evaluate(client, sessionId, "Boolean(document.body?.innerText.includes('CFR') || document.body?.innerText.includes('VFR')) && Boolean(document.body?.innerText.includes('镜头 2')) && document.querySelectorAll('video').length === 1")), "刷新后未恢复真实素材与校准草稿", 90_000)
  const finalState = await evaluate(client, sessionId, "({ videos: document.querySelectorAll('video').length, hasExactTiming: document.body.innerText.includes('CFR') || document.body.innerText.includes('VFR'), hasSecondShot: document.body.innerText.includes('镜头 2') })")
  assert.deepEqual(finalState, { videos: 1, hasExactTiming: true, hasSecondShot: true })
})
