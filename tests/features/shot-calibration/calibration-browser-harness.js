import { existsSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { spawn, spawnSync } from "node:child_process"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { resolve } from "node:path"

export const root = resolve(import.meta.dirname, "..", "..", "..")
export const web = resolve(root, "apps", "web")
export const browserPath = [process.env.AISENLENS_CHROME_PATH, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"].find((path) => path && existsSync(path))

export function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }
export async function port() { return new Promise((resolve, reject) => { const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const address = server.address(); server.close(() => resolve(address.port)) }) }) }
export async function until(check, message, timeoutMs = 30_000) { const deadline = Date.now() + timeoutMs; while (Date.now() < deadline) { let value = false; try { value = await check() } catch { value = false } if (value) return value; await wait(150) } throw new Error(message) }
export function evaluate(client, sessionId, expression) { return client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true }, sessionId).then((result) => { if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? "浏览器脚本执行失败"); return result.result.value }) }
export function clientFor(url) { const socket = new WebSocket(url); let id = 0; const pending = new Map(); socket.addEventListener("message", (event) => { const message = JSON.parse(String(event.data)); const item = pending.get(message.id); if (!item) return; pending.delete(message.id); message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result) }); const ready = new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }) }); return { async send(method, params = {}, sessionId) { await ready; const requestId = ++id; const result = new Promise((resolve, reject) => pending.set(requestId, { resolve, reject })); socket.send(JSON.stringify({ id: requestId, method, params, ...(sessionId ? { sessionId } : {}) })); return result }, close() { socket.close() } } }

export async function launchBrowser(context, label) {
  const [serverPort, debugPort] = await Promise.all([port(), port()])
  const profile = await mkdtemp(resolve(tmpdir(), `aisenlens-${label}-`))
  const vite = spawn(process.execPath, [resolve(web, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--strictPort", "--port", String(serverPort)], { cwd: web, env: { ...process.env, PORT: String(serverPort) }, stdio: "ignore", windowsHide: true })
  let browser
  let client
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
  const version = await until(async () => { const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`).catch(() => null); return response?.ok ? response.json() : false }, "浏览器调试端口未启动")
  client = clientFor(version.webSocketDebuggerUrl)
  const target = await client.send("Target.createTarget", { url: "about:blank" })
  const attached = await client.send("Target.attachToTarget", { targetId: target.targetId, flatten: true })
  const sessionId = attached.sessionId
  await client.send("Runtime.enable", {}, sessionId)
  await client.send("Page.enable", {}, sessionId)
  await client.send("DOM.enable", {}, sessionId)
  await client.send("Page.navigate", { url: `http://127.0.0.1:${serverPort}/projects` }, sessionId)
  return { client, sessionId, serverPort, version }
}

export async function createProjectAndEnterEditor(client, sessionId) {
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('项目库')")), "项目库未加载")
  await until(async () => (await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.includes('新建项目')); if (!button) return false; button.click(); return true })()")), "新建项目按钮未出现")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('新建拉片项目')")), "新建项目弹窗未打开")
  await until(async () => (await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.includes('创建并进入编辑器')); if (!button) return false; button.click(); return true })()")), "进入编辑器按钮未出现")
  await until(async () => (await evaluate(client, sessionId, "location.pathname === '/app'")), "项目未进入编辑器")
}

export async function chooseVideoFile(client, sessionId, filePath) {
  await evaluate(client, sessionId, "(() => { window.showOpenFilePicker = undefined; const prototype = HTMLInputElement.prototype; if (prototype.__aisenlensFilePickerPatched) return; const nativeClick = prototype.click; prototype.click = function() { if (this.type === 'file' && !this.isConnected) document.body.appendChild(this); if (this.type !== 'file') nativeClick.call(this); }; prototype.__aisenlensFilePickerPatched = true })()")
  await until(async () => (await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '准备'); if (!button) return false; button.click(); return true })()")), "准备阶段按钮未出现")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('素材')")), "准备阶段未加载")
  await until(async () => (await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.includes('选择视频') || element.textContent?.includes('选择本地视频')); if (!button) return false; button.click(); return true })()")), "选择视频按钮未出现")
  const rootNode = await client.send("DOM.getDocument", { depth: 1 }, sessionId)
  const fileInput = await until(async () => { const result = await client.send("DOM.querySelector", { nodeId: rootNode.root.nodeId, selector: "input[type=file]" }, sessionId); return result.nodeId || false }, "文件输入框未出现")
  await client.send("DOM.setFileInputFiles", { nodeId: fileInput, files: [filePath] }, sessionId)
  await evaluate(client, sessionId, "document.querySelector('input[type=file]')?.dispatchEvent(new Event('change', { bubbles: true }))")
}

export async function openCalibration(client, sessionId) {
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('本地视频已关联') || document.body.innerText.includes('视频已重新关联') || document.body.innerText.includes('已连接')")), "视频未关联到项目", 60_000)
  await until(async () => (await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '校准'); if (!button) return false; button.click(); return true })()")), "校准按钮未出现")
  await until(async () => (await evaluate(client, sessionId, "document.body.innerText.includes('镜头校准')")), "校准页未加载")
}
