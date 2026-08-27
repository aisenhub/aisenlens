import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { mkdtemp, rm } from "node:fs/promises"
import { existsSync } from "node:fs"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import test from "node:test"

const rootDirectory = resolve(import.meta.dirname, "..")
const chromeCandidates = [
  process.env.AISENLENS_CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter((candidate) => typeof candidate === "string" && candidate.length > 0)

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        server.close()
        reject(new Error("无法分配测试端口。"))
        return
      }
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
  const messageText = typeof message === "function" ? message() : message
  throw new Error(`${messageText}${lastError instanceof Error ? `: ${lastError.message}` : ""}`)
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`请求失败：${response.status} ${url}`)
  return response.json()
}

function startProcess(command, args) {
  return spawn(command, args, {
    cwd: rootDirectory,
    stdio: "ignore",
    windowsHide: true,
  })
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
    close() {
      socket.close()
    },
  }
}

async function evaluate(client, sessionId, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  }, sessionId)
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  }
  return result.result.value
}

test("浏览器导出 Worker 可生成并重新解析带蒙版的视频", { timeout: 180_000 }, async (context) => {
  const chromePath = chromeCandidates.find((candidate) => existsSync(candidate))
  assert.ok(chromePath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")

  const [serverPort, debuggerPort] = await Promise.all([
    getAvailablePort(),
    getAvailablePort(),
  ])
  const serverUrl = `http://127.0.0.1:${serverPort}`
  const chromeProfileDirectory = await mkdtemp(resolve(tmpdir(), "aisenlens-export-test-"))
  const vite = startProcess(process.execPath, [
    resolve(rootDirectory, "node_modules/vite/bin/vite.js"),
    "--host", "127.0.0.1",
    "--port", String(serverPort),
    "--strictPort",
  ])
  let chrome = null
  let client = null
  context.after(async () => {
    client?.close()
    await stopProcess(chrome)
    await stopProcess(vite)
    await rm(chromeProfileDirectory, { recursive: true, force: true })
  })

  await waitFor(async () => (await fetch(`${serverUrl}/`)).ok, "Vite 未能启动")
  chrome = startProcess(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${debuggerPort}`,
    `--user-data-dir=${chromeProfileDirectory}`,
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ])
  const version = await waitFor(
    () => fetchJson(`http://127.0.0.1:${debuggerPort}/json/version`),
    "Chrome DevTools 未能启动",
  )
  client = createCdpClient(version.webSocketDebuggerUrl)
  const target = await client.send("Target.createTarget", { url: "about:blank" })
  const attachment = await client.send("Target.attachToTarget", { targetId: target.targetId, flatten: true })
  const sessionId = attachment.sessionId
  await client.send("Runtime.enable", {}, sessionId)
  await client.send("Page.enable", {}, sessionId)
  await client.send("Page.navigate", { url: serverUrl }, sessionId)

  await waitFor(
    async () => evaluate(
      client,
      sessionId,
      `location.href.startsWith('${serverUrl}')`,
    ),
    "页面没有完成加载",
  )
  let verificationModuleError = ""
  await waitFor(
    async () => {
      try {
        return await evaluate(
          client,
          sessionId,
          `import('${serverUrl}/test/video-export-verification.ts').then(() => true)`,
        )
      } catch (error) {
        verificationModuleError = error instanceof Error ? error.message : String(error)
        return false
      }
    },
    () => `导出验证模块没有完成加载${verificationModuleError ? `: ${verificationModuleError}` : ""}`,
  )
  const result = await evaluate(client, sessionId, `
    (async () => {
      const verification = await import('${serverUrl}/test/video-export-verification.ts');
      return verification.runVideoExportBrowserVerification();
    })()
  `)

  assert.ok(result.exports.length > 0, "没有完成任何可用容器的导出")
  for (const exported of result.exports) {
    assert.ok(exported.size > 1_000, `${exported.format} 导出文件为空或过小`)
    assert.equal(exported.width, 320)
    assert.equal(exported.height, 180)
    assert.ok(exported.duration > 0, `${exported.format} 导出视频没有可读取的时长`)
    assert.ok(exported.progress.some((entry) => entry.phase === "encoding-video" && entry.completedFrames === 3))
    assert.ok(exported.progress.some((entry) => entry.phase === "finalizing"))
    assert.equal(exported.streamed.streamed, true, `${exported.format} 没有使用流式写入`)
    assert.equal(exported.streamed.hasBlob, false, `${exported.format} 流式导出仍创建了 Blob`)
    assert.ok(exported.streamed.size > 1_000, `${exported.format} 流式导出文件为空或过小`)
    assert.equal(exported.streamed.width, 320)
    assert.equal(exported.streamed.height, 180)
    assert.ok(exported.streamed.duration > 0, `${exported.format} 流式导出视频没有可读取的时长`)
    if (exported.audioSupported) {
      assert.equal(exported.hasAudio, true, `${exported.format} 未写入项目音轨`)
      assert.equal(exported.streamed.hasAudio, true, `${exported.format} 流式导出未写入项目音轨`)
      assert.ok(exported.progress.some((entry) => entry.phase === "mixing-audio"))
      assert.ok(exported.progress.some((entry) => entry.phase === "encoding-audio"))
    }
  }
  assert.ok(result.cancellationProgress.some((entry) => entry.phase === "encoding-video" && entry.completedFrames === 1))
  assert.match(result.cancellationMessage, /取消/)
})
