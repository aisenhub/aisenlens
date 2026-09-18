import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import test from "node:test"

const rootDirectory = resolve(import.meta.dirname, "..", "..", "..")
const webDirectory = resolve(rootDirectory, "apps", "webapp")
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

async function clickButtonByAriaLabel(client, sessionId, label) {
  return evaluate(client, sessionId, `(() => {
    const button = [...document.querySelectorAll('button')].find((element) => element.getAttribute('aria-label') === ${JSON.stringify(label)} && element.getClientRects().length > 0);
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
  await client.send("Target.activateTarget", { targetId: target.targetId })
  await client.send("Runtime.enable", {}, sessionId)
  await client.send("Page.enable", {}, sessionId)
  await client.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId)
  await client.send("Emulation.setFocusEmulationEnabled", { enabled: true }, sessionId)
  await client.send("Page.navigate", { url: `${serverUrl}/projects` }, sessionId)

  await waitFor(async () => (await evaluate(client, sessionId, `document.body.innerText.includes("项目库")`)), "项目库没有加载")
  await waitFor(async () => clickButton(client, sessionId, "新建项目"), "新建项目按钮没有出现")
  await waitFor(async () => (await evaluate(client, sessionId, `document.body.innerText.includes("新建拉片项目")`)), "新建项目窗口没有打开")
  await waitFor(async () => clickButton(client, sessionId, "创建并进入编辑器"), "进入编辑器按钮没有出现")
  await waitFor(async () => (await evaluate(client, sessionId, `location.pathname === "/app" && Boolean(new URL(location.href).searchParams.get("project"))`)), "空项目没有进入工作台")
  await waitFor(async () => (await evaluate(client, sessionId, `document.body.innerText.includes("准备素材与镜头地图")`)), "准备阶段内容没有加载")
  const prepareText = await evaluate(client, sessionId, "document.body.innerText")
  assert.equal(prepareText.includes("应用分镜"), false, "准备页不应在弹窗外展示应用分镜按钮")
  assert.equal(prepareText.includes("候选分镜"), false, "准备页不应在弹窗外展示候选分镜详情")

  const projectId = await evaluate(client, sessionId, "new URL(location.href).searchParams.get('project')")
  assert.ok(projectId, "工作台 URL 缺少 project id")

  assert.equal(await clickButtonByAriaLabel(client, sessionId, "展开工作区导航"), true, "找不到展开工作区导航按钮")
  await waitFor(async () => (await evaluate(client, sessionId, `JSON.parse(localStorage.getItem("aisenlens.ui.native-studio.v1") || "{}").railExpanded === true`)), "Rail 展开状态没有持久化")
  await waitFor(async () => (await evaluate(client, sessionId, `[...document.querySelectorAll('nav[aria-label="工作区"]')].some((nav) => nav.getBoundingClientRect().width >= 170)`)), "桌面 Rail 没有展开到预期宽度")

  await client.send("Page.reload", {}, sessionId)
  await waitFor(async () => (await evaluate(client, sessionId, `document.body.innerText.includes("准备素材与镜头地图")`)), "reload 后 Preparation 没有恢复")
  await waitFor(async () => (await evaluate(client, sessionId, `Boolean(document.querySelector('button[aria-label="收起工作区导航"]'))`)), "reload 后 Rail 展开状态没有恢复")

  assert.equal(await clickButtonByAriaLabel(client, sessionId, "工作区布局"), true, "找不到工作区布局 Popover 入口")
  await waitFor(async () => (await evaluate(client, sessionId, `document.body.innerText.includes("界面密度")`)), "布局 Popover 没有从触发源打开")
  assert.equal(await clickButton(client, sessionId, "紧凑"), true, "找不到紧凑 Density 选项")
  await waitFor(async () => (await evaluate(client, sessionId, `document.querySelector(".native-studio-window")?.getAttribute("data-density") === "compact"`)), "Density 没有应用到 Native Studio root")
  await waitFor(async () => (await evaluate(client, sessionId, `JSON.parse(localStorage.getItem("aisenlens.ui.native-studio.v1") || "{}").workspaces?.preparation?.density === "compact"`)), "Density 没有持久化")
  assert.equal(await clickButtonByAriaLabel(client, sessionId, "工作区布局"), true, "布局 Popover 不能关闭")

  const preparationButtonPoint = await evaluate(client, sessionId, `(() => {
    const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === "准备" && element.getClientRects().length > 0);
    const rect = button?.getBoundingClientRect();
    return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
  })()`)
  assert.ok(preparationButtonPoint, "无法定位 Preparation Workspace 按钮")
  await client.send("Input.dispatchMouseEvent", { type: "mousePressed", x: preparationButtonPoint.x, y: preparationButtonPoint.y, button: "right", buttons: 2, clickCount: 1 }, sessionId)
  await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: preparationButtonPoint.x, y: preparationButtonPoint.y, button: "right", buttons: 0, clickCount: 1 }, sessionId)
  await waitFor(async () => (await evaluate(client, sessionId, `document.body.innerText.includes("恢复该工作区布局")`)), "Workspace Context Menu 没有打开")
  assert.equal(await evaluate(client, sessionId, `(() => {
    const item = [...document.querySelectorAll('[role="menuitem"]')].find((element) => element.textContent?.includes("恢复该工作区布局"));
    if (!item) return false;
    item.click();
    return true;
  })()`), true, "Context Menu 恢复布局动作不可执行")
  await waitFor(async () => (await evaluate(client, sessionId, `JSON.parse(localStorage.getItem("aisenlens.ui.native-studio.v1") || "{}").workspaces?.preparation?.density === "standard"`)), "Context Menu 恢复布局没有生效")

  assert.equal(await clickButtonByAriaLabel(client, sessionId, "打开命令面板"), true, "找不到 Command Palette 入口")
  await waitFor(async () => (await evaluate(client, sessionId, `Boolean(document.querySelector('[aria-label="命令面板"]')) && document.body.innerText.includes("打开准备工作区")`)), "Command Palette 没有打开")
  assert.equal(await clickButton(client, sessionId, "打开准备工作区"), true, "Command Palette 命令不可执行")
  await waitFor(async () => (await evaluate(client, sessionId, `!document.querySelector('[aria-label="命令面板"]')`)), "执行命令后 Command Palette 没有关闭")

  const workspaces = [
    ["准备", "preparation", "准备素材与镜头地图"],
    ["分析", "analysis", "全片结构与节奏"],
    ["成果", "results", "成果数据视图"],
  ]
  for (const [label, workspace, expectedText] of workspaces) {
    assert.equal(await clickButton(client, sessionId, label), true, `找不到 ${label} 工作区按钮`)
    await waitFor(async () => (await evaluate(client, sessionId, `new URL(location.href).searchParams.get("workspace") === ${JSON.stringify(workspace)} && !new URL(location.href).searchParams.has("stage")`)), `${label} canonical URL 没有更新`)
    await waitFor(async () => (await evaluate(client, sessionId, `document.body.innerText.includes(${JSON.stringify(expectedText)})`)), `${label} 工作区没有加载`)
  }

  await client.send("Page.navigate", { url: `${serverUrl}/app?project=${projectId}&workspace=analysis&view=notes` }, sessionId)
  await waitFor(async () => (await evaluate(client, sessionId, `document.body.innerText.includes("回看我的笔记")`)), "Analysis Notes 没有加载")

  assert.equal(await clickButton(client, sessionId, "成果"), true, "找不到成果工作区按钮")
  await waitFor(async () => (await evaluate(client, sessionId, `new URL(location.href).searchParams.get("workspace") === "results"`)), "Results 没有打开")
  assert.equal(await clickButton(client, sessionId, "分析"), true, "找不到分析工作区按钮")
  await waitFor(async () => (await evaluate(client, sessionId, `new URL(location.href).searchParams.get("workspace") === "analysis" && new URL(location.href).searchParams.get("view") === "notes"`)), "Analysis 没有恢复上次 Notes View")
  await waitFor(async () => (await evaluate(client, sessionId, `document.body.innerText.includes("回看我的笔记")`)), "恢复 Analysis 后 Notes 内容没有恢复")

  await client.send("Page.navigate", { url: `${serverUrl}/app?project=${projectId}&workspace=analysis&view=scenes` }, sessionId)
  await waitFor(async () => (await evaluate(client, sessionId, `Boolean(document.querySelector('[role="separator"][aria-label="调整分镜导航宽度"]'))`)), "Analysis 分镜导航 resize handle 没有加载")
  const initialNavigationWidth = await evaluate(client, sessionId, `document.querySelector(".editor-shot-list")?.getBoundingClientRect().width || 0`)
  assert.ok(initialNavigationWidth >= 180, "Analysis 分镜导航初始宽度异常")
  const initialStoredNavigationWidth = await evaluate(client, sessionId, `JSON.parse(localStorage.getItem("aisenlens.ui.native-studio.v1") || "{}").workspaces.analysis.navigationWidth`)
  const resizeHandlePoint = await evaluate(client, sessionId, `(() => {
    const handle = document.querySelector('[role="separator"][aria-label="调整分镜导航宽度"]');
    const rect = handle?.getBoundingClientRect();
    return rect ? { x: rect.left + rect.width / 2, y: rect.top + Math.min(80, rect.height / 2) } : null;
  })()`)
  assert.ok(resizeHandlePoint, "无法定位分镜导航 resize handle")
  await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: resizeHandlePoint.x, y: resizeHandlePoint.y }, sessionId)
  await client.send("Input.dispatchMouseEvent", { type: "mousePressed", x: resizeHandlePoint.x, y: resizeHandlePoint.y, button: "left", buttons: 1, clickCount: 1 }, sessionId)
  await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: resizeHandlePoint.x + 24, y: resizeHandlePoint.y, button: "left", buttons: 1 }, sessionId)
  await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: resizeHandlePoint.x + 24, y: resizeHandlePoint.y, button: "left", buttons: 0, clickCount: 1 }, sessionId)
  await waitFor(async () => (await evaluate(client, sessionId, `JSON.parse(localStorage.getItem("aisenlens.ui.native-studio.v1") || "{}").workspaces?.analysis?.navigationWidth > ${initialStoredNavigationWidth}`)), "鼠标 resize 没有持久化")
  const resizedNavigationWidth = await evaluate(client, sessionId, `JSON.parse(localStorage.getItem("aisenlens.ui.native-studio.v1") || "{}").workspaces.analysis.navigationWidth`)

  const initialTimelineHeight = await evaluate(client, sessionId, `JSON.parse(localStorage.getItem("aisenlens.ui.native-studio.v1") || "{}").workspaces.analysis.timelineHeight`)
  const timelineHandlePoint = await evaluate(client, sessionId, `(() => {
    const handle = document.querySelector('[role="separator"][aria-label="调整时间线高度"]');
    const rect = handle?.getBoundingClientRect();
    return rect ? { x: rect.left + Math.min(120, rect.width / 2), y: rect.top + rect.height / 2 } : null;
  })()`)
  assert.ok(timelineHandlePoint, "无法定位 Timeline resize handle")
  await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: timelineHandlePoint.x, y: timelineHandlePoint.y }, sessionId)
  await client.send("Input.dispatchMouseEvent", { type: "mousePressed", x: timelineHandlePoint.x, y: timelineHandlePoint.y, button: "left", buttons: 1, clickCount: 1 }, sessionId)
  await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: timelineHandlePoint.x, y: timelineHandlePoint.y - 24, button: "left", buttons: 1 }, sessionId)
  await client.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: timelineHandlePoint.x, y: timelineHandlePoint.y - 24, button: "left", buttons: 0, clickCount: 1 }, sessionId)
  await waitFor(async () => (await evaluate(client, sessionId, `JSON.parse(localStorage.getItem("aisenlens.ui.native-studio.v1") || "{}").workspaces?.analysis?.timelineHeight > ${initialTimelineHeight}`)), "Timeline resize 没有持久化")
  const resizedTimelineHeight = await evaluate(client, sessionId, `JSON.parse(localStorage.getItem("aisenlens.ui.native-studio.v1") || "{}").workspaces.analysis.timelineHeight`)

  assert.equal(await clickButtonByAriaLabel(client, sessionId, "隐藏检查器"), true, "找不到隐藏检查器按钮")
  await waitFor(async () => (await evaluate(client, sessionId, `JSON.parse(localStorage.getItem("aisenlens.ui.native-studio.v1") || "{}").workspaces?.analysis?.inspectorOpen === false`)), "检查器折叠状态没有持久化")
  await waitFor(async () => (await evaluate(client, sessionId, `!document.querySelector(".editor-analysis-panel")`)), "桌面检查器折叠后仍在 DOM 中")

  await client.send("Page.reload", {}, sessionId)
  await waitFor(async () => (await evaluate(client, sessionId, `new URL(location.href).searchParams.get("view") === "scenes"`)), "reload 后 Analysis Scenes 没有恢复")
  await waitFor(async () => (await evaluate(client, sessionId, `Math.abs((document.querySelector(".editor-shot-list")?.getBoundingClientRect().width || 0) - ${resizedNavigationWidth}) < 1`)), "reload 后分镜导航宽度没有恢复")
  await waitFor(async () => (await evaluate(client, sessionId, `Math.abs((document.querySelector(".native-resizable-timeline")?.getBoundingClientRect().height || 0) - ${resizedTimelineHeight}) < 1`)), "reload 后 Timeline 高度没有恢复")
  assert.equal(await evaluate(client, sessionId, `!document.querySelector(".editor-analysis-panel")`), true, "reload 后检查器折叠状态没有恢复")
  assert.equal(await clickButtonByAriaLabel(client, sessionId, "显示检查器"), true, "找不到恢复检查器按钮")
  await waitFor(async () => (await evaluate(client, sessionId, `Boolean(document.querySelector(".editor-analysis-panel"))`)), "检查器没有恢复")

  await client.send("Emulation.setDeviceMetricsOverride", { width: 1100, height: 800, deviceScaleFactor: 1, mobile: false }, sessionId)
  await waitFor(async () => (await evaluate(client, sessionId, `getComputedStyle(document.querySelector(".native-workspace-nav-desktop")).display !== "none" && getComputedStyle(document.querySelector(".native-workspace-nav-mobile")).display === "none"`)), "1100px Focus 档没有保留桌面 Rail")
  assert.equal(await evaluate(client, sessionId, `getComputedStyle(document.querySelector('[aria-label="调整分镜导航宽度"]')).display === "none"`), true, "Focus 档不应保留 docked resize handle")

  await client.send("Emulation.setDeviceMetricsOverride", { width: 900, height: 760, deviceScaleFactor: 1, mobile: false }, sessionId)
  await waitFor(async () => (await evaluate(client, sessionId, `getComputedStyle(document.querySelector(".native-workspace-nav-mobile")).display !== "none" && getComputedStyle(document.querySelector(".native-workspace-nav-desktop")).display === "none"`)), "900px Review-Survival 档没有切换水平 Workspace 导航")

  await client.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId)
  await client.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] }, sessionId)
  const reducedMotionDuration = await evaluate(client, sessionId, `parseFloat(getComputedStyle(document.querySelector(".native-studio-rail")).transitionDuration) || 0`)
  assert.ok(reducedMotionDuration <= 0.06, `reduced-motion 下 Rail transition 仍过长：${reducedMotionDuration}`)
  await client.send("Emulation.setEmulatedMedia", { features: [] }, sessionId)

  await client.send("Page.navigate", { url: `${serverUrl}/app?project=${projectId}&workspace=results&view=creative` }, sessionId)
  await waitFor(async () => (await evaluate(client, sessionId, `document.body.innerText.includes("创作转化")`)), "Results Creative 没有加载")

  assert.equal(await clickButton(client, sessionId, "项目列表"), true, "找不到返回项目列表按钮")
  await waitFor(async () => (await evaluate(client, sessionId, `location.pathname === "/projects"`)), "点击返回项目列表后路由没有离开编辑器")
  await waitFor(async () => (await evaluate(client, sessionId, `document.body.innerText.includes("项目库")`)), "返回项目列表后项目库没有加载")
})
