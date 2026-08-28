import { existsSync } from "node:fs"
import { mkdir, writeFile, rm } from "node:fs/promises"
import { spawn } from "node:child_process"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { resolve } from "node:path"

const repositoryDirectory = resolve(import.meta.dirname, "..")
const outputDirectory = resolve(repositoryDirectory, "apps", "web", "test", "fixtures", "auto-shot")
const outputPath = resolve(outputDirectory, "synthetic.webm")
const chromePath = [
  process.env.AISENLENS_CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => typeof candidate === "string" && existsSync(candidate))

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function waitFor(check, timeoutMilliseconds = 30_000) {
  const deadline = Date.now() + timeoutMilliseconds
  while (Date.now() < deadline) {
    try {
      const value = await check()
      if (value) return value
    } catch {
      // The browser may not have opened its debugging endpoint yet.
    }
    await wait(100)
  }
  throw new Error("等待 Chrome DevTools 超时。")
}

function getAvailablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") return reject(new Error("无法分配端口。"))
      server.close((error) => (error ? reject(error) : resolvePort(address.port)))
    })
  })
}

function createClient(url) {
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
  const ready = new Promise((resolveReady, rejectReady) => {
    socket.addEventListener("open", resolveReady, { once: true })
    socket.addEventListener("error", rejectReady, { once: true })
  })
  return {
    async send(method, params = {}, sessionId = undefined) {
      await ready
      const id = nextId++
      const result = new Promise((resolveResult, rejectResult) => pending.set(id, { resolve: resolveResult, reject: rejectResult }))
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
      return result
    },
    close() {
      socket.close()
    },
  }
}

async function evaluate(client, sessionId, expression) {
  const result = await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId)
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  return result.result.value
}

if (!chromePath) throw new Error("未找到 Chrome；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
const debuggerPort = await getAvailablePort()
const profileDirectory = resolve(tmpdir(), `aisenlens-fixture-${Date.now()}`)
await mkdir(profileDirectory, { recursive: true })
const chrome = spawn(chromePath, ["--headless=new", `--remote-debugging-port=${debuggerPort}`, `--user-data-dir=${profileDirectory}`, "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore", windowsHide: true })
let client = null
try {
  const version = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${debuggerPort}/json/version`)
    return response.ok ? response.json() : null
  })
  client = createClient(version.webSocketDebuggerUrl)
  const target = await client.send("Target.createTarget", { url: "about:blank" })
  const attachment = await client.send("Target.attachToTarget", { targetId: target.targetId, flatten: true })
  const sessionId = attachment.sessionId
  await client.send("Runtime.enable", {}, sessionId)
  const base64 = await evaluate(client, sessionId, `
    (async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 360;
      const context = canvas.getContext('2d');
      const stream = canvas.captureStream(30);
      const mimeType = ['video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm'].find((value) => MediaRecorder.isTypeSupported(value));
      if (!mimeType) throw new Error('当前 Chrome 不支持 WebM MediaRecorder。');
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_000_000 });
      const chunks = [];
      recorder.addEventListener('dataavailable', (event) => event.data.size && chunks.push(event.data));
      const stopped = new Promise((resolve) => recorder.addEventListener('stop', resolve, { once: true }));
      recorder.start();
      const totalFrames = 360;
      for (let frame = 0; frame < totalFrames; frame += 1) {
        const phase = frame < 60 ? 0 : frame < 120 ? 1 : frame < 180 ? 2 : frame < 240 ? 3 : 4;
        const fade = phase === 2 ? (frame - 120) / 60 : 0;
        const colors = phase === 0 ? [22, 80, 180] : phase === 1 ? [190, 35, 35] : phase === 2 ? [Math.round(190 * (1 - fade) + 25 * fade), Math.round(35 * (1 - fade) + 165 * fade), Math.round(35 * (1 - fade) + 55 * fade)] : phase === 3 ? [220, 180, 30] : [25, 25, 25];
        context.fillStyle = 'rgb(' + colors.join(',') + ')';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'rgba(255,255,255,0.35)';
        context.fillRect((frame * 7) % canvas.width, 40, 120, 36);
        await new Promise((resolve) => setTimeout(resolve, 1000 / 30));
      }
      recorder.stop();
      await stopped;
      stream.getTracks().forEach((track) => track.stop());
      const buffer = new Uint8Array(await new Blob(chunks, { type: mimeType }).arrayBuffer());
      let binary = '';
      const chunkSize = 0x8000;
      for (let index = 0; index < buffer.length; index += chunkSize) binary += String.fromCharCode(...buffer.subarray(index, index + chunkSize));
      return btoa(binary);
    })()
  `, sessionId)
  await mkdir(outputDirectory, { recursive: true })
  await writeFile(outputPath, Buffer.from(base64, "base64"))
  console.log(`Generated ${outputPath}`)
} finally {
  client?.close()
  if (chrome.exitCode === null) chrome.kill()
  await wait(250)
  try {
    await rm(profileDirectory, { recursive: true, force: true })
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "EBUSY")) throw error
  }
}
