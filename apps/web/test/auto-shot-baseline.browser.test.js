import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import test from "node:test"

const projectDirectory = resolve(import.meta.dirname, "..")
const repositoryDirectory = resolve(projectDirectory, "..", "..")
const chromePath = [
  process.env.AISENLENS_CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => typeof candidate === "string" && existsSync(candidate))

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string")
        return reject(new Error("无法分配测试端口。"))
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
  throw new Error(
    `${message}${lastError instanceof Error ? `: ${lastError.message}` : ""}`,
  )
}

function startProcess(command, args) {
  return spawn(command, args, {
    cwd: projectDirectory,
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
      const response = new Promise((resolve, reject) =>
        pending.set(id, { resolve, reject }),
      )
      socket.send(
        JSON.stringify({
          id,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        }),
      )
      return response
    },
    close() {
      socket.close()
    },
  }
}

async function evaluate(client, sessionId, expression) {
  const result = await client.send(
    "Runtime.evaluate",
    {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    },
    sessionId,
  )
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text,
    )
  return result.result.value
}

// The real H.264 fixture is intentionally decoded to its last presentation frame.
// Keep the outer test budget above the per-operation budget so a slower developer
// machine does not turn a valid full-media run into a false timeout.
test(
  "当前 Scene Engine 浏览器矩阵可重复运行并记录环境与性能指标",
  { timeout: 900_000 },
  async (context) => {
    assert.ok(
      chromePath,
      "未找到 Chrome；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。",
    )
    const [serverPort, debuggerPort] = await Promise.all([
      getAvailablePort(),
      getAvailablePort(),
    ])
    const serverUrl = `http://127.0.0.1:${serverPort}`
    const chromeProfileDirectory = await mkdtemp(
      resolve(tmpdir(), "aisenlens-auto-shot-baseline-"),
    )
    const vite = startProcess(process.execPath, [
      resolve(projectDirectory, "node_modules/vite/bin/vite.js"),
      "--host",
      "127.0.0.1",
      "--port",
      String(serverPort),
      "--strictPort",
    ])
    let chrome = null
    let client = null
    context.after(async () => {
      client?.close()
      await stopProcess(chrome)
      await stopProcess(vite)
      try {
        await rm(chromeProfileDirectory, { recursive: true, force: true })
      } catch (error) {
        if (
          !(
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "EBUSY"
          )
        )
          throw error
      }
    })
    await waitFor(
      async () => (await fetch(`${serverUrl}/`)).ok,
      "Vite 未能启动",
    )
    chrome = startProcess(chromePath, [
      "--headless=new",
      `--remote-debugging-port=${debuggerPort}`,
      `--user-data-dir=${chromeProfileDirectory}`,
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ])
    const version = await waitFor(async () => {
      const response = await fetch(
        `http://127.0.0.1:${debuggerPort}/json/version`,
      )
      return response.ok ? response.json() : null
    }, "Chrome DevTools 未能启动")
    client = createCdpClient(version.webSocketDebuggerUrl)
    const target = await client.send("Target.createTarget", {
      url: "about:blank",
    })
    const attachment = await client.send("Target.attachToTarget", {
      targetId: target.targetId,
      flatten: true,
    })
    const sessionId = attachment.sessionId
    await client.send("Runtime.enable", {}, sessionId)
    await client.send("Page.enable", {}, sessionId)
    await client.send("Page.navigate", { url: serverUrl }, sessionId)
    await waitFor(
      () =>
        evaluate(client, sessionId, `location.href.startsWith('${serverUrl}')`),
      "页面没有完成加载",
    )
    if (process.env.AISENLENS_ONLY_WASM_SMOKE === "1") {
      const moduleProbe = await evaluate(
        client,
        sessionId,
        `new Promise((resolve, reject) => { const worker = new Worker('${serverUrl}/test/scene-engine-module.worker.ts', { type: 'module' }); const messages = []; const timer = setTimeout(() => { worker.terminate(); resolve({ status: 'timeout', messages }); }, 20_000); worker.onmessage = (event) => { messages.push(event.data); if (event.data.type === 'ERROR') { clearTimeout(timer); worker.terminate(); resolve({ status: 'error', messages }); } if (event.data.type === 'READY') { clearTimeout(timer); worker.terminate(); resolve({ status: 'ready', messages }); } }; worker.onerror = (event) => { clearTimeout(timer); worker.terminate(); resolve({ status: 'runtime-error', messages, error: event.message }); }; worker.postMessage({ type: 'INIT' }); })`,
      )
      await mkdir(resolve(repositoryDirectory, "test-results"), {
        recursive: true,
      })
      await writeFile(
        resolve(
          repositoryDirectory,
          "test-results",
          "scene-engine-module-probe.json",
        ),
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            browser: version.Browser,
            ...moduleProbe,
          },
          null,
          2,
        ),
        "utf8",
      )
      assert.equal(moduleProbe.status, "ready", JSON.stringify(moduleProbe))
      return
    }
    if (process.env.AISENLENS_RUN_PROJECT_REPOSITORY_MIGRATION_SMOKE === "1") {
      const migration = await evaluate(
        client,
        sessionId,
        `(async () => (await import('${serverUrl}/test/project-repository-migration.verification.ts')).runProjectRepositoryMigrationVerification())()`,
      )
      assert.equal(migration.projectPreserved, true, JSON.stringify(migration))
      assert.equal(migration.shotsPreserved, true, JSON.stringify(migration))
      assert.equal(migration.markersPreserved, true, JSON.stringify(migration))
      assert.equal(
        migration.screenshotsPreserved,
        true,
        JSON.stringify(migration),
      )
      assert.equal(migration.legacyRuns, 0, JSON.stringify(migration))
      assert.equal(migration.taskRoundTrip, true, JSON.stringify(migration))
      assert.equal(
        migration.mediaIdentityMismatchInvalidated,
        true,
        JSON.stringify(migration),
      )
      assert.equal(migration.projectTaskUnique, true, JSON.stringify(migration))
      assert.equal(migration.taskDeletion, true, JSON.stringify(migration))
      assert.equal(migration.recoveryRestored, true, JSON.stringify(migration))
      assert.equal(
        migration.recoverySnapshotRetention,
        true,
        JSON.stringify(migration),
      )
      return
    }
    if (process.env.AISENLENS_RUN_AUTO_SHOT_HOOK_SMOKE === "1") {
      const hookLifecycle = await evaluate(
        client,
        sessionId,
        `(async () => (await import('${serverUrl}/test/auto-shot-hook-lifecycle.verification.ts')).runAutoShotHookLifecycleVerification())()`,
      )
      assert.equal(
        hookLifecycle.paused,
        "paused",
        JSON.stringify(hookLifecycle),
      )
      assert.equal(
        hookLifecycle.resumed,
        "completed",
        JSON.stringify(hookLifecycle),
      )
      assert.ok(hookLifecycle.resumedFrames > 12, JSON.stringify(hookLifecycle))
      assert.ok(
        hookLifecycle.resumedCandidates > 0,
        JSON.stringify(hookLifecycle),
      )
      assert.equal(
        hookLifecycle.cancelled,
        "cancelled",
        JSON.stringify(hookLifecycle),
      )
      assert.equal(hookLifecycle.switched, true, JSON.stringify(hookLifecycle))
      assert.equal(
        hookLifecycle.switchedCancelled,
        "cancelled",
        JSON.stringify(hookLifecycle),
      )
      await mkdir(resolve(repositoryDirectory, "test-results"), {
        recursive: true,
      })
      await writeFile(
        resolve(
          repositoryDirectory,
          "test-results",
          "scene-engine-hook-lifecycle-probe.json",
        ),
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            browser: version.Browser,
            ...hookLifecycle,
          },
          null,
          2,
        ),
        "utf8",
      )
      return
    }
    const capability = await evaluate(
      client,
      sessionId,
      `new Promise((resolve, reject) => { const worker = new Worker('${serverUrl}/test/auto-shot-capability.worker.ts', { type: 'module' }); worker.onmessage = (event) => { worker.terminate(); event.data.ok ? resolve(event.data.result) : reject(new Error(event.data.error)); }; worker.onerror = (event) => { worker.terminate(); reject(new Error(event.message)); }; worker.postMessage({}); })`,
    )
    assert.ok(
      capability.samples.length > 0 || capability.errors.length > 0,
      "能力验证没有获得样本或明确错误",
    )
    const pathBenchmark = await evaluate(
      client,
      sessionId,
      `(async () => (await import('${serverUrl}/test/auto-shot-path-benchmark.verification.ts')).runAutoShotPathBenchmarkVerification())()`,
    )
    assert.equal(pathBenchmark.sampleCount, 24)
    const mediaDecoder = await evaluate(
      client,
      sessionId,
      `(async () => (await import('${serverUrl}/test/auto-shot-media.verification.ts')).runAutoShotMediaVerification())()`,
    )
    assert.ok(mediaDecoder.frameCount > 0, "顺序解码没有提交任何帧")
    assert.equal(
      mediaDecoder.timestampsMonotonic,
      true,
      "顺序解码的 presentation timestamp 必须单调",
    )
    assert.equal(
      mediaDecoder.stats.openedSamples,
      mediaDecoder.stats.closedSamples,
      "每个打开的 VideoSample 都必须 close",
    )
    assert.equal(mediaDecoder.stats.submittedFrames, mediaDecoder.frameCount)
    assert.equal(
      mediaDecoder.lastFrame?.presentationIndex,
      mediaDecoder.frameCount - 1,
      "媒体验证必须覆盖到媒体末帧",
    )
    assert.ok(
      mediaDecoder.firstFrames.length > 0 &&
        mediaDecoder.firstFrames.length <= 12,
      "报告只保留有界的首帧摘要，不得截断解码",
    )
    if (process.env.AISENLENS_RUN_FIXTURE_REPEAT_SMOKE === "1") {
      const repeatMedia = await evaluate(
        client,
        sessionId,
        `(async () => (await import('${serverUrl}/test/auto-shot-media.verification.ts')).runAutoShotMediaVerification())()`,
      )
      assert.equal(
        repeatMedia.frameCount,
        mediaDecoder.frameCount,
        "H.264 fixture 两次运行的解码帧数必须一致",
      )
      assert.deepEqual(
        repeatMedia.firstFrames,
        mediaDecoder.firstFrames,
        "H.264 fixture 两次运行的起始帧摘要必须一致",
      )
      assert.deepEqual(
        repeatMedia.lastFrame,
        mediaDecoder.lastFrame,
        "H.264 fixture 两次运行的末帧摘要必须一致",
      )
      assert.equal(repeatMedia.timestampsMonotonic, true)
      await writeFile(
        resolve(
          repositoryDirectory,
          "test-results",
          "scene-engine-fixture-repeat-probe.json",
        ),
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            browser: version.Browser,
            firstMedia: mediaDecoder,
            secondMedia: repeatMedia,
          },
          null,
          2,
        ),
        "utf8",
      )
    }
    if (process.env.AISENLENS_RUN_WASM_SMOKE === "1") {
      const moduleProbe = await evaluate(
        client,
        sessionId,
        `new Promise((resolve, reject) => { const worker = new Worker('${serverUrl}/test/scene-engine-module.worker.ts', { type: 'module' }); const messages = []; const timer = setTimeout(() => { worker.terminate(); resolve({ status: 'timeout', messages }); }, 20_000); worker.onmessage = (event) => { messages.push(event.data); if (event.data.type === 'ERROR') { clearTimeout(timer); worker.terminate(); resolve({ status: 'error', messages }); } if (event.data.type === 'READY') worker.postMessage({ type: 'START', jobId: 'wasm-smoke-1', source: new Blob(), mediaIdentityDigest: 'sha256:wasm-smoke', config: { hardCut: { kind: 'content', threshold: 2700, weights: { hue: 3333, saturation: 3333, luma: 3334 } }, fade: null, minimumSceneDurationUs: 600000, analysis: { maxWidth: 96, temporalSampling: { kind: 'every-frame' } }, diagnostics: 'off' } }); if (event.data.type === 'COMPLETED') { clearTimeout(timer); worker.terminate(); resolve({ status: 'completed', messages }); } }; worker.onerror = (event) => { clearTimeout(timer); worker.terminate(); resolve({ status: 'runtime-error', messages, error: event.message }); }; worker.postMessage({ type: 'INIT' }); })`,
      )
      await writeFile(
        resolve(
          repositoryDirectory,
          "test-results",
          "scene-engine-module-probe.json",
        ),
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            browser: version.Browser,
            ...moduleProbe,
          },
          null,
          2,
        ),
        "utf8",
      )
      assert.equal(moduleProbe.status, "completed", JSON.stringify(moduleProbe))
    }
    if (process.env.AISENLENS_RUN_MEDIA_WASM_SMOKE === "1") {
      const mediaSmoke = await evaluate(
        client,
        sessionId,
        `new Promise(async (resolve) => { const source = await fetch('${serverUrl}/test/test.mov').then((response) => response.blob()); const worker = new Worker('${serverUrl}/test/scene-engine-media-module.worker.ts', { type: 'module' }); const messages = []; const timer = setTimeout(() => { worker.terminate(); resolve({ status: 'timeout', messages }); }, 300_000); worker.onmessage = (event) => { messages.push(event.data); if (event.data.type === 'READY') worker.postMessage({ type: 'START', jobId: 'wasm-media-smoke-1', source, mediaIdentityDigest: 'sha256:media-smoke', config: { hardCut: { kind: 'content', threshold: 1800, weights: { hue: 3333, saturation: 3333, luma: 3334 } }, fade: null, minimumSceneDurationUs: 600000, analysis: { maxWidth: 96, temporalSampling: { kind: 'every-frame' } }, diagnostics: 'off' } }); if (event.data.type === 'COMPLETED') { clearTimeout(timer); worker.terminate(); resolve({ status: 'completed', messages }); } if (event.data.type === 'ERROR') { clearTimeout(timer); worker.terminate(); resolve({ status: 'error', messages }); } }; worker.onerror = (event) => { clearTimeout(timer); worker.terminate(); resolve({ status: 'runtime-error', messages, error: event.message }); }; worker.postMessage({ type: 'INIT' }); })`,
      )
      await writeFile(
        resolve(
          repositoryDirectory,
          "test-results",
          "scene-engine-media-module-probe.json",
        ),
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            browser: version.Browser,
            ...mediaSmoke,
          },
          null,
          2,
        ),
        "utf8",
      )
      assert.equal(mediaSmoke.status, "completed", JSON.stringify(mediaSmoke))
    }
    if (process.env.AISENLENS_RUN_MEDIA_LIFECYCLE_SMOKE === "1") {
      const lifecycle = await evaluate(
        client,
        sessionId,
        `(async () => (await import('${serverUrl}/test/auto-shot-media-lifecycle.verification.ts')).runAutoShotMediaLifecycleVerification())()`,
      )
      await writeFile(
        resolve(
          repositoryDirectory,
          "test-results",
          "scene-engine-media-lifecycle-probe.json",
        ),
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            browser: version.Browser,
            ...lifecycle,
          },
          null,
          2,
        ),
        "utf8",
      )
      assert.equal(
        lifecycle.pause.status,
        "RESUMED_COMPLETED",
        JSON.stringify(lifecycle),
      )
      assert.ok(
        lifecycle.pause.messages.some(
          (message) => message.type === "CHECKPOINT",
        ),
        JSON.stringify(lifecycle),
      )
      assert.equal(
        lifecycle.cancel.status,
        "CANCELLED",
        JSON.stringify(lifecycle),
      )
      assert.equal(lifecycle.error.status, "ERROR", JSON.stringify(lifecycle))
    }
    if (process.env.AISENLENS_RUN_BACKEND_PARITY_SMOKE === "1") {
      const parity = await evaluate(
        client,
        sessionId,
        `(async () => (await import('${serverUrl}/test/auto-shot-backend-parity.verification.ts')).runAutoShotBackendParityVerification())()`,
      )
      await writeFile(
        resolve(
          repositoryDirectory,
          "test-results",
          "scene-engine-backend-parity-probe.json",
        ),
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            browser: version.Browser,
            ...parity,
          },
          null,
          2,
        ),
        "utf8",
      )
      assert.equal(
        parity.compared.decodedFramesEqual,
        true,
        JSON.stringify(parity),
      )
      assert.equal(
        parity.compared.boundariesEqual,
        true,
        JSON.stringify(parity),
      )
      assert.equal(parity.compared.durationEqual, true, JSON.stringify(parity))
    }
    if (process.env.AISENLENS_RUN_SYNTHETIC_MEMORY_SMOKE === "1") {
      const memory = await evaluate(
        client,
        sessionId,
        `new Promise((resolve, reject) => { const worker = new Worker('${serverUrl}/test/scene-engine-memory-synthetic.worker.ts', { type: 'module' }); const timer = setTimeout(() => { worker.terminate(); reject(new Error('合成帧内存 smoke 超时')); }, 120000); worker.onmessage = (event) => { clearTimeout(timer); worker.terminate(); event.data.ok ? resolve(event.data.result) : reject(new Error(event.data.error)); }; worker.onerror = (event) => { clearTimeout(timer); worker.terminate(); reject(new Error(event.message)); }; worker.postMessage({}); })`,
      )
      await writeFile(
        resolve(
          repositoryDirectory,
          "test-results",
          "scene-engine-memory-synthetic-probe.json",
        ),
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            browser: version.Browser,
            ...memory,
          },
          null,
          2,
        ),
        "utf8",
      )
      assert.equal(memory.frames, 200, JSON.stringify(memory))
      assert.equal(memory.reserveCount, 1, JSON.stringify(memory))
      assert.equal(
        memory.maxWasmBytes,
        memory.initialWasmBytes,
        JSON.stringify(memory),
      )
    }
    const reportPath = resolve(
      repositoryDirectory,
      "test-results",
      "scene-engine-browser-matrix.json",
    )
    await mkdir(resolve(repositoryDirectory, "test-results"), {
      recursive: true,
    })
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          browser: version.Browser,
          media: mediaDecoder,
        },
        null,
        2,
      ),
      "utf8",
    )
    await writeFile(
      resolve(repositoryDirectory, "test-results", "auto-shot-capability.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          browser: version.Browser,
          ...capability,
        },
        null,
        2,
      ),
      "utf8",
    )
    await writeFile(
      resolve(
        repositoryDirectory,
        "test-results",
        "auto-shot-path-benchmark.json",
      ),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          browser: version.Browser,
          ...pathBenchmark,
        },
        null,
        2,
      ),
      "utf8",
    )
    await writeFile(
      resolve(
        repositoryDirectory,
        "test-results",
        "auto-shot-media-decoder.json",
      ),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          browser: version.Browser,
          ...mediaDecoder,
        },
        null,
        2,
      ),
      "utf8",
    )
  },
)
