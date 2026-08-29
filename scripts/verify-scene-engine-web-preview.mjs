import assert from "node:assert/strict"
import { createServer } from "node:http"
import { existsSync } from "node:fs"
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises"
import { mkdtemp, rm } from "node:fs/promises"
import { createServer as createNetServer } from "node:net"
import { tmpdir } from "node:os"
import { resolve, extname, normalize, join, basename, sep } from "node:path"
import { spawn } from "node:child_process"

const repositoryDirectory = resolve(import.meta.dirname, "..")
const outputDirectory = resolve(repositoryDirectory, "test-results", "scene-engine-web-build")
const manifest = JSON.parse(await readFile(resolve(outputDirectory, "scene-engine-manifest.json"), "utf8"))
const fixtureRelativePath = process.env.AISENLENS_SCENE_FIXTURE?.trim() || "apps/web/test/test.mov"
const fixturePath = resolve(repositoryDirectory, fixtureRelativePath)
const repositoryPathPrefix = repositoryDirectory.endsWith(sep) ? repositoryDirectory : `${repositoryDirectory}${sep}`
if (!fixturePath.startsWith(repositoryPathPrefix)) throw new Error("场景验证素材必须位于仓库目录内。")
const fixtureName = basename(fixturePath)
const chromePath = [
  process.env.AISENLENS_CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => typeof candidate === "string" && existsSync(candidate))
assert.ok(chromePath, "未找到 Chrome；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")

async function availablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      server.close((error) => error ? reject(error) : resolvePort(address.port))
    })
  })
}

function contentType(file) {
  return { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".wasm": "application/wasm", ".mov": "video/quicktime", ".json": "application/json" }[extname(file)] ?? "application/octet-stream"
}

async function serveStatic(port) {
  await mkdir(resolve(outputDirectory, "test"), { recursive: true })
  await copyFile(fixturePath, resolve(outputDirectory, "test", fixtureName))
  const server = createServer(async (request, response) => {
    try {
      const requestPath = new URL(request.url ?? "/", `http://${request.headers.host}`).pathname
      console.error(`[preview-smoke] request ${requestPath}`)
      const relativePath = requestPath.startsWith(manifest.base) ? requestPath.slice(manifest.base.length) : requestPath.slice(1)
      const safePath = normalize(relativePath).replace(/^([.][.][\\/])+/, "")
      let filePath = join(outputDirectory, safePath || "index.html")
      if (!filePath.startsWith(outputDirectory)) throw new Error("unsafe path")
      try { await readFile(filePath) } catch { filePath = join(outputDirectory, "index.html") }
      const body = await readFile(filePath)
      response.writeHead(200, { "content-type": `${contentType(filePath)}; charset=utf-8`, "cache-control": "no-store" })
      response.end(body)
    } catch (error) {
      response.writeHead(404)
      response.end(String(error))
    }
  })
  await new Promise((resolveServer, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolveServer) })
  return server
}

function startChrome(port, profile) {
  return spawn(chromePath, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore", windowsHide: true })
}

async function waitFor(check, message, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try { const value = await check(); if (value) return value } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 150))
  }
  throw new Error(message)
}

function cdp(url) {
  const socket = new WebSocket(url)
  let id = 0
  const pending = new Map()
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data))
    if (!message.id) return
    const request = pending.get(message.id)
    if (!request) return
    pending.delete(message.id)
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result)
  })
  const ready = new Promise((resolveReady, reject) => { socket.addEventListener("open", resolveReady, { once: true }); socket.addEventListener("error", reject, { once: true }) })
  return {
    async send(method, params = {}, sessionId) {
      await ready
      const requestId = ++id
      const result = new Promise((resolveResult, rejectResult) => pending.set(requestId, { resolve: resolveResult, reject: rejectResult }))
      socket.send(JSON.stringify({ id: requestId, method, params, ...(sessionId ? { sessionId } : {}) }))
      return result
    },
    close() { socket.close() },
  }
}

const serverPort = await availablePort()
const debuggerPort = await availablePort()
console.error(`[preview-smoke] ports ${serverPort}/${debuggerPort}`)
const server = await serveStatic(serverPort)
console.error(`[preview-smoke] static server ready`)
const profile = await mkdtemp(resolve(tmpdir(), "aisenlens-scene-engine-preview-"))
const chrome = startChrome(debuggerPort, profile)
let client
try {
  const version = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debuggerPort}/json/version`)
    return response.ok ? response.json() : null
  }, "Chrome DevTools 未能启动")
  console.error(`[preview-smoke] chrome ready`)
  client = cdp(version.webSocketDebuggerUrl)
  const target = await client.send("Target.createTarget", { url: "about:blank" })
  const attachment = await client.send("Target.attachToTarget", { targetId: target.targetId, flatten: true })
  const sessionId = attachment.sessionId
  const baseUrl = `http://127.0.0.1:${serverPort}${manifest.base}`
  const workerUrl = `${baseUrl}${manifest.workerFiles[0]}`
  await client.send("Runtime.enable", {}, sessionId)
  await client.send("Page.enable", {}, sessionId)
  await client.send("Page.navigate", { url: baseUrl }, sessionId)
  console.error(`[preview-smoke] navigating ${baseUrl}`)
  await waitFor(() => client.send("Runtime.evaluate", { expression: `location.href.startsWith('${baseUrl}')`, returnByValue: true }, sessionId).then((result) => result.result?.value), "预览页面没有完成加载")
  console.error(`[preview-smoke] page ready; worker ${workerUrl}`)
  const expression = `(async () => new Promise(async (resolve) => { const source = await fetch('${baseUrl}test/${fixtureName}').then((response) => response.blob()); const worker = new Worker('${workerUrl}', { type: 'module' }); const messages = []; const timer = setTimeout(() => { worker.terminate(); resolve({ status: 'timeout', messages }); }, 600000); worker.onmessage = (event) => { messages.push(event.data); if (event.data.type === 'READY') worker.postMessage({ type: 'START', jobId: 'preview-smoke-1', source, mediaIdentityDigest: 'sha256:preview-smoke', config: { hardCut: { kind: 'content', threshold: 1800, weights: { hue: 3333, saturation: 3333, luma: 3334 } }, fade: null, minimumSceneDurationUs: 600000, analysis: { maxWidth: 96, temporalSampling: { kind: 'every-frame' } }, diagnostics: 'off' } }); if (event.data.type === 'COMPLETED' || event.data.type === 'ERROR') { clearTimeout(timer); worker.terminate(); resolve({ status: event.data.type === 'COMPLETED' ? 'completed' : 'error', messages }); } }; worker.onerror = (event) => { clearTimeout(timer); worker.terminate(); resolve({ status: 'runtime-error', messages, error: event.message }); }; worker.postMessage({ type: 'INIT' }); }))()`.replace(/\\/g, "\\\\")
  const result = await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId)
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  const smoke = result.result.value
  console.error(`[preview-smoke] worker result ${smoke?.status}`)
  const ready = smoke?.messages?.find((message) => message.type === "READY")
  assert.ok(ready, JSON.stringify(smoke))
  assert.ok(["wasm-media-simd", "wasm-media"].includes(ready.version), JSON.stringify(ready))
  assert.ok(["wasm-simd", "wasm-baseline"].includes(ready.backend), JSON.stringify(ready))
  await writeFile(resolve(repositoryDirectory, "test-results", "scene-engine-preview-smoke.json"), JSON.stringify({ generatedAt: new Date().toISOString(), browser: version.Browser, fixture: fixtureRelativePath, base: manifest.base, worker: manifest.workerFiles[0], backend: ready.backend, version: ready.version, ...smoke }, null, 2), "utf8")
  assert.equal(smoke.status, "completed", JSON.stringify(smoke))
  const completed = smoke.messages.find((message) => message.type === "COMPLETED")
  const progress = [...smoke.messages].reverse().find((message) => message.type === "PROGRESS")
  assert.ok(completed?.result?.media?.decodedFrames > 12, JSON.stringify(smoke))
  // Progress is intentionally throttled and may omit the final decoded frame;
  // the terminal result is authoritative for complete-media coverage.
  assert.ok(progress?.progress?.decodedFrames > 0, JSON.stringify(smoke))
  assert.ok(progress?.progress?.processedUs > 0, JSON.stringify(smoke))
  assert.ok(completed.result.boundaries.length > 0, JSON.stringify(smoke))
  console.log(JSON.stringify({ status: smoke.status, fixture: fixtureRelativePath, backend: ready.backend, version: ready.version, base: manifest.base, worker: manifest.workerFiles[0], wasm: manifest.wasmFiles[0], decodedFrames: completed.result.media.decodedFrames, boundaries: completed.result.boundaries.length, messageTypes: smoke.messages.map((message) => message.type) }, null, 2))
} finally {
  client?.close()
  if (chrome.exitCode === null) chrome.kill()
  await new Promise((resolveClose) => server.close(() => resolveClose()))
  await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  try {
    await rm(profile, { recursive: true, force: true })
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "EBUSY")) throw error
    console.error("[preview-smoke] Chrome 临时 profile 仍被系统占用，已保留待系统释放。")
  }
}
