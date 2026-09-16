import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { spawn, spawnSync } from "node:child_process"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import test from "node:test"

const root = resolve(import.meta.dirname, "..", "..", "..")
const web = resolve(root, "apps", "web")
const browserPath = [process.env.AISENLENS_CHROME_PATH, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"].find((path) => path && existsSync(path))

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }
async function port() { return new Promise((resolve, reject) => { const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const address = server.address(); server.close(() => resolve(address.port)) }) }) }
async function until(check, message) { const deadline = Date.now() + 30_000; while (Date.now() < deadline) { if (await check()) return; await wait(150) } throw new Error(message) }
function evaluate(client, sessionId, expression) { return client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true }, sessionId).then((result) => { if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value }) }
function clientFor(url) { const socket = new WebSocket(url); let id = 0; const pending = new Map(); socket.addEventListener("message", (event) => { const message = JSON.parse(String(event.data)); const item = pending.get(message.id); if (!item) return; pending.delete(message.id); message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result) }); const ready = new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }) }); return { async send(method, params = {}, sessionId) { await ready; const requestId = ++id; const result = new Promise((resolve, reject) => pending.set(requestId, { resolve, reject })); socket.send(JSON.stringify({ id: requestId, method, params, ...(sessionId ? { sessionId } : {}) })); return result }, close() { socket.close() } } }

test("校准页在无媒体时提供真实阻断，不展示虚构候选或完成率", { timeout: 90_000 }, async (context) => {
  if (!browserPath) { context.skip("未找到 Chrome/Edge；可设置 AISENLENS_CHROME_PATH 后重试。"); return }
  const [serverPort, debugPort] = await Promise.all([port(), port()])
  const profile = await mkdtemp(resolve(tmpdir(), "aisenlens-calibration-browser-"))
  const vite = spawn(process.execPath, [resolve(web, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--strictPort"], { cwd: web, env: { ...process.env, PORT: String(serverPort) }, stdio: "ignore", windowsHide: true })
  let browser; let client
  context.after(async () => {
    client?.close()
    for (const child of [browser, vite]) {
      if (child?.exitCode === null) {
        child.kill()
        if (child.pid) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true })
      }
    }
    await wait(500)
    await rm(profile, { recursive: true, force: true }).catch(() => undefined)
  })
  await until(async () => (await fetch(`http://127.0.0.1:${serverPort}/`).catch(() => null))?.ok, "Vite 未启动")
  browser = spawn(browserPath, ["--headless=new", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore", windowsHide: true })
  const version = await (async () => { const deadline = Date.now() + 30_000; while (Date.now() < deadline) { const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`).catch(() => null); if (response?.ok) return response.json(); await wait(150) } throw new Error("浏览器调试端口未启动") })()
  client = clientFor(version.webSocketDebuggerUrl)
  const target = await client.send("Target.createTarget", { url: "about:blank" })
  const attached = await client.send("Target.attachToTarget", { targetId: target.targetId, flatten: true })
  const sessionId = attached.sessionId
  await client.send("Runtime.enable", {}, sessionId)
  await client.send("Page.enable", {}, sessionId)
  await client.send("Page.navigate", { url: `http://127.0.0.1:${serverPort}/projects` }, sessionId)
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('项目库')")), "项目库未加载")
  await until(async () => (await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.includes('新建项目')); if (!button) return false; button.click(); return true })()")), "新建项目按钮未出现")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('新建拉片项目')")), "新建项目弹窗未打开")
  await until(async () => (await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.includes('创建并进入编辑器')); if (!button) return false; button.click(); return true })()")), "进入编辑器按钮未出现")
  await until(async () => (await evaluate(client, sessionId, "location.pathname === '/app'")), "项目未进入编辑器")
  await until(async () => (await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '校准'); if (!button) return false; button.click(); return true })()")), "校准按钮未出现")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('复核候选镜头')")), "校准页未加载")
  const text = await evaluate(client, sessionId, "document.body.innerText")
  assert.equal(text.includes('80%'), false)
  assert.equal(text.includes('智能检查'), false)
  assert.equal(text.includes('请先在准备阶段导入视频'), true)
})
