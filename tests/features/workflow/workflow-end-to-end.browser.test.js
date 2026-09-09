import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import test from "node:test"

const rootDirectory = resolve(import.meta.dirname, "..", "..", "..")
const webDirectory = resolve(rootDirectory, "apps", "web")
const chromeCandidates = [
  process.env.AISENLENS_CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter((candidate) => typeof candidate === "string" && existsSync(candidate))

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") return reject(new Error("无法分配测试端口。"))
      server.close((error) => (error ? reject(error) : resolve(address.port)))
    })
  })
}

async function waitFor(check, message, timeoutMilliseconds = 30_000) {
  const deadline = Date.now() + timeoutMilliseconds
  let lastError = null
  while (Date.now() < deadline) {
    try {
      const value = await check()
      if (value) return value
    } catch (error) {
      lastError = error
    }
    await wait(150)
  }
  throw new Error(`${message}${lastError instanceof Error ? `: ${lastError.message}` : ""}`)
}

function startProcess(command, args, env = process.env, cwd = rootDirectory) {
  return spawn(command, args, { cwd, env, stdio: "ignore", windowsHide: true })
}

async function stopProcess(process) {
  if (!process || process.exitCode !== null) return
  process.kill()
  await Promise.race([
    new Promise((resolve) => process.once("exit", resolve)),
    wait(5_000),
  ])
}

function createCdpClient(url) {
  const socket = new WebSocket(url)
  let nextId = 1
  const pending = new Map()
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data))
    if (!message.id) return
    const request = pending.get(message.id)
    if (!request) return
    pending.delete(message.id)
    if (message.error) request.reject(new Error(message.error.message))
    else request.resolve(message.result)
  })
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true })
    socket.addEventListener("error", reject, { once: true })
  })
  return {
    async send(method, params = {}, sessionId = undefined) {
      await ready
      const id = nextId++
      const response = new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
      return response
    },
    close() { socket.close() },
  }
}

async function evaluate(client, sessionId, expression) {
  const result = await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true }, sessionId)
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  return result.result.value
}

async function clickButton(client, sessionId, text) {
  return evaluate(client, sessionId, `(() => {
    const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim().includes(${JSON.stringify(text)}));
    if (!button) return false;
    button.click();
    return true;
  })()`)
}

test("隔离浏览器可完成 Workflow 阶段导航与真实空项目流程", { timeout: 120_000 }, async (context) => {
  const chromePath = chromeCandidates[0]
  assert.ok(chromePath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")

  const [serverPort, debuggerPort] = await Promise.all([getAvailablePort(), getAvailablePort()])
  const serverUrl = `http://127.0.0.1:${serverPort}`
  const profileDirectory = await mkdtemp(resolve(tmpdir(), "aisenlens-workflow-test-"))
  const vite = startProcess(process.execPath, [resolve(webDirectory, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--strictPort"], { ...process.env, PORT: String(serverPort) }, webDirectory)
  let chrome = null
  let client = null
  context.after(async () => {
    client?.close()
    await stopProcess(chrome)
    await stopProcess(vite)
    await rm(profileDirectory, { recursive: true, force: true }).catch(() => undefined)
  })

  await waitFor(async () => (await fetch(`${serverUrl}/`)).ok, "Vite 未能启动")
  chrome = startProcess(chromePath, ["--headless=new", `--remote-debugging-port=${debuggerPort}`, `--user-data-dir=${profileDirectory}`, "--no-first-run", "--no-default-browser-check", "about:blank"])
  const version = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debuggerPort}/json/version`)
    return response.ok ? response.json() : false
  }, "浏览器 DevTools 未能启动")
  client = createCdpClient(version.webSocketDebuggerUrl)
  const target = await client.send("Target.createTarget", { url: "about:blank" })
  const attachment = await client.send("Target.attachToTarget", { targetId: target.targetId, flatten: true })
  const sessionId = attachment.sessionId
  await client.send("Runtime.enable", {}, sessionId)
  await client.send("Page.enable", {}, sessionId)
  await client.send("Page.navigate", { url: `${serverUrl}/projects` }, sessionId)

  await waitFor(async () => (await evaluate(client, sessionId, `document.body.innerText.includes("项目库")`)), "项目库没有加载")
  await waitFor(async () => clickButton(client, sessionId, "新建项目"), "新建项目按钮没有出现")
  await waitFor(async () => (await evaluate(client, sessionId, `document.body.innerText.includes("新建拉片项目")`)), "新建项目窗口没有打开")
  await waitFor(async () => clickButton(client, sessionId, "创建并进入编辑器"), "进入编辑器按钮没有出现")
  await waitFor(async () => (await evaluate(client, sessionId, `location.pathname === "/app" && Boolean(new URL(location.href).searchParams.get("project"))`)), "空项目没有进入工作台")
  await waitFor(async () => (await evaluate(client, sessionId, `document.body.innerText.includes("准备素材与镜头地图")`)), "准备阶段内容没有加载")

  const stages = [
    ["准备", "prepare", "准备素材与镜头地图"],
    ["校准", "calibrate", "复核候选镜头"],
    ["总览", "overview", "全片结构与节奏"],
    ["深拆", "analyze", "ANALYZE"],
    ["学习", "learn", "回看我的笔记"],
    ["创作", "create", "创作工具"],
  ]
  for (const [label, stage, expectedText] of stages) {
    assert.equal(await clickButton(client, sessionId, label), true, `找不到 ${label} 阶段按钮`)
    await waitFor(async () => (await evaluate(client, sessionId, `new URL(location.href).searchParams.get("stage") === ${JSON.stringify(stage)}`)), `${label} URL 没有更新`)
    await waitFor(async () => (await evaluate(client, sessionId, `document.body.innerText.includes(${JSON.stringify(expectedText)})`)), `${label} 页面没有加载`) 
  }

  assert.equal(await clickButton(client, sessionId, "项目列表"), true, "找不到返回项目列表按钮")
  await waitFor(async () => (await evaluate(client, sessionId, `location.pathname === "/projects"`)), "点击返回项目列表后路由没有离开编辑器")
  await waitFor(async () => (await evaluate(client, sessionId, `document.body.innerText.includes("项目库")`)), "返回项目列表后项目库没有加载")
})
