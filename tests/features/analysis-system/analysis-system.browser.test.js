import assert from "node:assert/strict"
import test from "node:test"
import { browserPath, createProjectAndEnterEditor, evaluate, launchBrowser, until } from "../shot-calibration/calibration-browser-harness.js"

const importRepository = "/src/features/project/services/projectRepository.ts"

async function attachPage(client, serverPort, label) {
  const target = await client.send("Target.createTarget", { url: `http://127.0.0.1:${serverPort}/projects`, newWindow: false })
  const attached = await client.send("Target.attachToTarget", { targetId: target.targetId, flatten: true })
  await client.send("Runtime.enable", {}, attached.sessionId)
  await client.send("Page.enable", {}, attached.sessionId)
  await until(async () => await evaluate(client, attached.sessionId, "document.body.innerText.includes('项目库')"), `${label} 项目库未加载`)
  return attached.sessionId
}

async function navigateToProject(client, sessionId, serverPort, projectId, query = "stage=analyze&view=scenes") {
  await client.send("Page.navigate", { url: `http://127.0.0.1:${serverPort}/app?project=${projectId}&${query}` }, sessionId)
  await until(async () => await evaluate(client, sessionId, "location.pathname === '/app'"), "项目页未加载")
}

async function seedProject(client, sessionId, shotCount = 3) {
  return evaluate(client, sessionId, `(() => import(${JSON.stringify(importRepository)}).then(async ({ default: repository }) => {
    const { loadOrCreateProjectTemplate } = await import('/src/features/template/services/templateService.ts')
    const project = await repository.createProject({ title: '分析系统验收项目' })
    const template = await loadOrCreateProjectTemplate(project.id)
    const now = new Date().toISOString()
    const shots = Array.from({ length: ${shotCount} }, (_, index) => ({
      id: crypto.randomUUID(), projectId: project.id, order: index, startFrame: index * 24, endFrame: index * 24 + 24,
      status: 'draft', detection: { source: 'manual' }, primaryScreenshotId: null, screenshotIds: [], firstFrameScreenshotId: null, lastFrameScreenshotId: null,
      analysisFields: index === 0 ? { shot: { state: 'set', value: 'shot.wide' } } : {}, description: index === 0 ? '初始描述' : '', notes: index === 0 ? '初始笔记' : '', createdAt: now, updatedAt: now,
    }))
    const state = { project, shots, groups: [], markers: [], template, researchRanges: [], researchContexts: [] }
    const saved = await repository.saveProjectEditorState(state, project.updatedAt)
    return { projectId: project.id, updatedAt: saved.updatedAt, shotIds: shots.map((shot) => shot.id) }
  }))()`)
}

test("P1 保存 fault points 全部回滚且保留原始内存基线", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId } = await launchBrowser(context, "analysis-system-fault-rollback")
  const { projectId } = await seedProject(client, sessionId)
  const result = await evaluate(client, sessionId, `(() => import(${JSON.stringify(importRepository)}).then(async ({ default: repository, setProjectRepositoryFaultInjector }) => {
    const before = await repository.readProjectEditorState('${projectId}')
    const points = ['project-write', 'shots-write', 'groups-write', 'markers-write', 'template-write', 'research-range-write', 'research-context-write']
    const results = []
    for (const point of points) {
      const candidate = structuredClone(before)
      candidate.project = { ...candidate.project, title: '失败后不应出现的标题' }
      candidate.shots = candidate.shots.map((shot) => ({ ...shot, description: '失败后不应出现的描述' }))
      candidate.template = { ...candidate.template, name: '失败后不应出现的模板' }
      const now = new Date().toISOString()
      candidate.researchRanges = [{ id: crypto.randomUUID(), projectId: '${projectId}', mediaIdentityDigest: 'fault-test', startUs: 1, endUs: 2, title: 'fault', observation: '', interpretation: '', summary: '', createdAt: now, updatedAt: now, revision: 1 }]
      candidate.researchContexts = [{ id: crypto.randomUUID(), projectId: '${projectId}', target: { kind: 'shot', id: candidate.shots[0].id }, question: 'fault', status: 'in-progress', needsReview: false, needsReviewReasons: [], structureRevision: 1, evidence: [], createdAt: now, updatedAt: now, revision: 1 }]
      setProjectRepositoryFaultInjector((actual) => { if (actual === point) throw new Error('injected:' + actual) })
      let rejected = false
      try { await repository.saveProjectEditorState(candidate, before.project.updatedAt) } catch { rejected = true }
      setProjectRepositoryFaultInjector(null)
      const after = await repository.readProjectEditorState('${projectId}')
      results.push({ point, rejected, unchanged: JSON.stringify(after) === JSON.stringify(before) })
    }
    setProjectRepositoryFaultInjector(null)
    await repository.deleteProject('${projectId}')
    return results
  }))()`)
  assert.deepEqual(result, [
    { point: "project-write", rejected: true, unchanged: true },
    { point: "shots-write", rejected: true, unchanged: true },
    { point: "groups-write", rejected: true, unchanged: true },
    { point: "markers-write", rejected: true, unchanged: true },
    { point: "template-write", rejected: true, unchanged: true },
    { point: "research-range-write", rejected: true, unchanged: true },
    { point: "research-context-write", rejected: true, unchanged: true },
  ])
})

test("P1 UI 保存失败保留 dirty 与基线，清除故障后可重试成功", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId, serverPort } = await launchBrowser(context, "analysis-system-save-retry")
  const { projectId } = await seedProject(client, sessionId, 1)
  await navigateToProject(client, sessionId, serverPort, projectId, "stage=analyze&view=shots")
  await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('Shots')"), "Shots 视图未加载")
  await evaluate(client, sessionId, `import(${JSON.stringify(importRepository)}).then(({ setProjectRepositoryFaultInjector }) => setProjectRepositoryFaultInjector((point) => { if (point === 'project-write') throw new Error('ui-save-fault') }))`)
  await evaluate(client, sessionId, "(() => { const focus = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === 'Focus'); focus?.click(); return Boolean(focus) })()")
  await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('FOCUS ANALYSIS')"), "Focus 未打开")
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '大远景' && element.getClientRects().length > 0); button?.click(); return Boolean(button) })()")
  await until(async () => await evaluate(client, sessionId, "[...document.querySelectorAll('button')].some((element) => element.textContent?.trim() === '重试保存')"), "保存失败状态未出现")
  const failedState = await evaluate(client, sessionId, `import(${JSON.stringify(importRepository)}).then(({ default: repository }) => repository.readProjectEditorState('${projectId}').then((state) => state.shots[0].analysisFields.shot?.value))`)
  assert.equal(failedState, "shot.wide")
  await evaluate(client, sessionId, `import(${JSON.stringify(importRepository)}).then(({ setProjectRepositoryFaultInjector }) => setProjectRepositoryFaultInjector(null))`)
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '重试保存'); button?.click(); return Boolean(button) })()")
  await until(async () => await evaluate(client, sessionId, "[...document.querySelectorAll('button')].some((element) => element.textContent?.trim() === '保存') && ![...document.querySelectorAll('button')].some((element) => element.textContent?.trim() === '重试保存')"), "保存重试未恢复")
  const retriedState = await evaluate(client, sessionId, `import(${JSON.stringify(importRepository)}).then(({ default: repository }) => repository.readProjectEditorState('${projectId}').then((state) => state.shots[0].analysisFields.shot?.value))`)
  assert.equal(retriedState, "shot.extreme-wide")
  await evaluate(client, sessionId, `import(${JSON.stringify(importRepository)}).then(({ default: repository }) => repository.deleteProject('${projectId}'))`)
})

test("P1 两个标签页拒绝旧基线并保留较新的保存", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId, serverPort } = await launchBrowser(context, "analysis-system-concurrency")
  const { projectId } = await seedProject(client, sessionId, 1)
  const secondSessionId = await attachPage(client, serverPort, "第二标签页")
  await navigateToProject(client, secondSessionId, serverPort, projectId)
  const result = await evaluate(client, sessionId, `(() => import(${JSON.stringify(importRepository)}).then(async ({ default: repository }) => {
    const first = await repository.readProjectEditorState('${projectId}')
    return { first, baseline: first.project.updatedAt }
  }))()`)
  const second = await evaluate(client, secondSessionId, `(() => import(${JSON.stringify(importRepository)}).then((module) => module.default.readProjectEditorState('${projectId}')))()`)
  const firstSave = await evaluate(client, sessionId, `(() => import(${JSON.stringify(importRepository)}).then(async ({ default: repository }) => {
    const state = ${JSON.stringify(result.first)}
    state.project.title = '标签页 A 已保存'
    const saved = await repository.saveProjectEditorState(state, '${result.baseline}')
    return saved.title
  }))()`)
  const secondAttempt = await evaluate(client, secondSessionId, `(() => import(${JSON.stringify(importRepository)}).then(async ({ default: repository }) => {
    const state = ${JSON.stringify(second)}
    state.project.title = '标签页 B 不应覆盖'
    try { await repository.saveProjectEditorState(state, '${result.baseline}'); return { rejected: false } } catch (error) { return { rejected: true, message: error instanceof Error ? error.message : String(error) } }
  }))()`)
  const finalState = await evaluate(client, sessionId, `(() => import(${JSON.stringify(importRepository)}).then((module) => module.default.readProjectEditorState('${projectId}')))()`)
  assert.equal(firstSave, "标签页 A 已保存")
  assert.equal(secondAttempt.rejected, true)
  assert.match(secondAttempt.message, /其他标签页更新/)
  assert.equal(finalState.project.title, "标签页 A 已保存")
})

test("P1 Recovery 恢复模板、字段值、笔记和 Research/Evidence", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId } = await launchBrowser(context, "analysis-system-recovery")
  const { projectId } = await seedProject(client, sessionId, 1)
  const result = await evaluate(client, sessionId, `(() => import(${JSON.stringify(importRepository)}).then(async ({ default: repository }) => {
    const { createResearchRange, createResearchContext } = await import('/src/features/analysis/services/researchService.ts')
    const before = await repository.readProjectEditorState('${projectId}')
    const now = new Date().toISOString()
    const shotId = before.shots[0].id
    const range = createResearchRange({ projectId: '${projectId}', mediaIdentityDigest: 'recovery-media', startUs: 1000000, endUs: 2500000, title: '恢复范围', observation: '恢复观察', interpretation: '恢复解释', summary: '恢复摘要' })
    const context = createResearchContext({ projectId: '${projectId}', target: { kind: 'range', id: range.id }, question: '恢复问题', status: 'in-progress', needsReview: true, needsReviewReasons: ['恢复检查'], structureRevision: 1, evidence: [{ id: crypto.randomUUID(), kind: 'time-range', mediaIdentityDigest: 'recovery-media', startUs: 1000000, endUs: 2500000 }] })
    const snapshotState = structuredClone(before)
    snapshotState.project = { ...snapshotState.project, title: '恢复前项目' }
    snapshotState.template = { ...snapshotState.template, name: '恢复前模板', version: snapshotState.template.version + 1 }
    snapshotState.shots = [{ ...snapshotState.shots[0], description: '恢复前描述', notes: '恢复前笔记', analysisFields: { shot: { state: 'set', value: 'shot.close' }, sound: { state: 'unknown' } }, updatedAt: now }]
    snapshotState.researchRanges = [range]
    snapshotState.researchContexts = [context]
    const saved = await repository.saveProjectEditorState(snapshotState, before.project.updatedAt)
    const snapshot = { id: crypto.randomUUID(), projectId: '${projectId}', createdAt: now, ...(await repository.readProjectEditorState('${projectId}')) }
    await repository.saveProjectRecoverySnapshot(snapshot)
    const mutated = structuredClone(snapshotState)
    mutated.project = { ...mutated.project, title: '恢复后被改动' }
    mutated.template = { ...mutated.template, name: '被改动模板', version: mutated.template.version + 1 }
    mutated.shots = [{ ...mutated.shots[0], description: '被改动描述', notes: '被改动笔记', analysisFields: {} }]
    mutated.researchRanges = []
    mutated.researchContexts = []
    await repository.saveProjectEditorState(mutated, saved.updatedAt)
    await repository.restoreProjectRecoverySnapshot(snapshot)
    const restored = await repository.readProjectEditorState('${projectId}')
    await repository.deleteProject('${projectId}')
    return {
      title: restored.project.title,
      template: restored.template.name,
      entries: restored.shots[0].analysisFields,
      description: restored.shots[0].description,
      notes: restored.shots[0].notes,
      range: restored.researchRanges[0]?.title,
      context: restored.researchContexts[0]?.question,
      evidence: restored.researchContexts[0]?.evidence.length,
    }
  }))()`)
  assert.deepEqual(result, {
    title: "恢复前项目",
    template: "恢复前模板",
    entries: { shot: { state: "set", value: "shot.close" }, sound: { state: "unknown" } },
    description: "恢复前描述",
    notes: "恢复前笔记",
    range: "恢复范围",
    context: "恢复问题",
    evidence: 1,
  })
})

test("P1 只读盘点当前 IndexedDB schema 与 legacy 字段形态", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId } = await launchBrowser(context, "analysis-system-inventory")
  const { projectId } = await seedProject(client, sessionId, 1)
  const inventory = await evaluate(client, sessionId, `(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('aisenlens-projects')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const stores = [...database.objectStoreNames]
      const transaction = database.transaction(stores, 'readonly')
      const counts = {}
      let remaining = stores.length
      for (const storeName of stores) {
        const countRequest = transaction.objectStore(storeName).count()
        countRequest.onsuccess = () => { counts[storeName] = countRequest.result; remaining -= 1; if (!remaining) resolve({ version: database.version, stores, counts }) }
        countRequest.onerror = () => reject(countRequest.error)
      }
      if (!stores.length) resolve({ version: database.version, stores, counts })
    }
  }))()`)
  assert.equal(inventory.version, 17)
  assert.ok(inventory.stores.includes("projects"))
  assert.ok(inventory.stores.includes("project-templates"))
  assert.ok(inventory.stores.includes("recovery-snapshots"))
  assert.ok(inventory.stores.includes("research-ranges"))
  assert.equal(typeof inventory.counts.projects, "number")
  const shape = await evaluate(client, sessionId, `import(${JSON.stringify(importRepository)}).then(({ default: repository }) => repository.readProjectEditorState('${projectId}').then((state) => ({ project: Object.keys(state.project).sort(), shot: Object.keys(state.shots[0]).sort(), template: Object.keys(state.template ?? {}).sort() })))`)
  assert.ok(shape.project.includes("mediaAssets"))
  assert.ok(shape.project.includes("primaryVideoAssetId"))
  assert.ok(shape.shot.includes("analysisFields"))
  assert.ok(shape.template.includes("fieldDefinitions"))
  assert.ok(shape.template.includes("fieldUsages"))
  await evaluate(client, sessionId, `(() => import(${JSON.stringify(importRepository)}).then((module) => module.default.deleteProject('${projectId}')))()`)
})

test("P2 模板 dirty draft 与 Apply/Undo/Redo/重载链路", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId } = await launchBrowser(context, "analysis-system-template")
  const { projectId } = await seedProject(client, sessionId, 1)
  await navigateToProject(client, sessionId, await evaluate(client, sessionId, "location.port"), projectId, "stage=prepare&view=media")
  await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('模板设置')"), "模板设置入口未出现")
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.includes('模板设置')); button?.click(); return Boolean(button) })()")
  await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('分析任务与字段')"), "模板编辑器未打开")
  await evaluate(client, sessionId, "window.confirm = () => false; const input = document.querySelector('input[aria-label=分析任务名称]'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set; setter?.call(input, '未应用草稿'); input?.dispatchEvent(new Event('input', { bubbles: true }));")
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '取消'); button?.click(); return Boolean(button) })()")
  await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('有未应用修改')"), "dirty draft 未保留")
  assert.equal(await evaluate(client, sessionId, "document.body.innerText.includes('分析任务与字段')"), true)
  await evaluate(client, sessionId, "window.confirm = () => true; const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '取消'); button?.click();")
  await until(async () => !(await evaluate(client, sessionId, "document.body.innerText.includes('分析任务与字段')")), "dirty draft 未能关闭")
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.includes('模板设置')); button?.click(); return Boolean(button) })()")
  await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('分析任务与字段')"), "模板编辑器二次打开失败")
  const appliedName = `验收模板-${Date.now()}`
  await evaluate(client, sessionId, `(() => { const input = document.querySelector('input[aria-label=分析任务名称]'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set; setter?.call(input, ${JSON.stringify(appliedName)}); input?.dispatchEvent(new Event('input', { bubbles: true })); const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '应用配置'); button?.click(); return Boolean(button) })()`)
  await until(async () => !(await evaluate(client, sessionId, "document.body.innerText.includes('分析任务与字段')")), "模板 Apply 未关闭编辑器")
  await new Promise((resolve) => setTimeout(resolve, 900))
  const applied = await evaluate(client, sessionId, `(() => import(${JSON.stringify(importRepository)}).then((module) => module.default.getProjectTemplate('${projectId}').then((template) => template?.name)))()`)
  assert.equal(applied, appliedName)
  await evaluate(client, sessionId, "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))")
  await new Promise((resolve) => setTimeout(resolve, 700))
  const undone = await evaluate(client, sessionId, `(() => import(${JSON.stringify(importRepository)}).then((module) => module.default.getProjectTemplate('${projectId}').then((template) => template?.name)))()`)
  assert.notEqual(undone, appliedName)
  await evaluate(client, sessionId, "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true }))")
  await new Promise((resolve) => setTimeout(resolve, 700))
  const redone = await evaluate(client, sessionId, `(() => import(${JSON.stringify(importRepository)}).then((module) => module.default.getProjectTemplate('${projectId}').then((template) => template?.name)))()`)
  assert.equal(redone, appliedName)
})

test("P3 Focus 队列、字段复制、跳过与最后一镜", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId, serverPort } = await launchBrowser(context, "analysis-system-focus")
  const { projectId } = await seedProject(client, sessionId, 4)
  await navigateToProject(client, sessionId, serverPort, projectId, "stage=analyze&view=shots&mode=sequential")
  await until(async () => await evaluate(client, sessionId, "new URL(location.href).searchParams.get('view') === 'shots'"), "Shots 视图 URL 未恢复")
  await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('Shots')"), "Shots 视图未加载")
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === 'Focus'); button?.click(); return Boolean(button) })()")
  await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('FOCUS ANALYSIS')"), "Focus 未打开")
  await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('本轮队列 1/4')"), "Focus 顺序队列未加载")
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.includes('远景') && element.getClientRects().length > 0); button?.click(); return Boolean(button) })()")
  await new Promise((resolve) => setTimeout(resolve, 250))
  await evaluate(client, sessionId, "document.activeElement?.blur(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))")
  await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('本轮队列 2/4')"), "Focus 下一镜未工作")
  await until(async () => await evaluate(client, sessionId, "[...document.querySelectorAll('button')].some((element) => element.textContent?.includes('复制上一镜') && !element.disabled)"), "复制上一镜未启用")
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.includes('复制上一镜') && element.getClientRects().length > 0); button?.click(); return Boolean(button) })()")
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.includes('跳过') && element.getClientRects().length > 0); button?.click(); return Boolean(button) })()")
  await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('本轮队列 3/4')"), "Focus 跳过未推进")
  await evaluate(client, sessionId, "(() => { for (let index = 0; index < 2; index += 1) { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.includes(index === 0 ? '下一镜' : '跳过') && element.getClientRects().length > 0); button?.click() } return true })()")
  await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('本轮结束')"), "Focus 最后一镜状态未出现")
})

test("P3 Focus 选段范围只排入范围内镜头", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId, serverPort } = await launchBrowser(context, "analysis-system-focus-range")
  const { projectId } = await seedProject(client, sessionId, 4)
  const rangeId = await evaluate(client, sessionId, `import('/src/features/project/services/projectRepository.ts').then(async ({ default: repository }) => { const { createResearchRange } = await import('/src/features/analysis/services/researchService.ts'); const state = await repository.readProjectEditorState('${projectId}'); const range = createResearchRange({ projectId: '${projectId}', mediaIdentityDigest: 'range-media', startUs: 1200000, endUs: 3200000, title: '选段验收', observation: '', interpretation: '', summary: '' }); await repository.saveProjectEditorState({ ...state, researchRanges: [range], researchContexts: [] }, state.project.updatedAt); return range.id })`)
  await navigateToProject(client, sessionId, serverPort, projectId, `stage=analyze&view=shots&mode=range&scopeKind=transient-range&fromUs=1200000&toUs=3200000&targetKind=range&targetId=${rangeId}`)
  await until(async () => await evaluate(client, sessionId, "new URL(location.href).searchParams.get('view') === 'shots'"), "选段 Shots 视图未加载")
  await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('3 镜在当前范围')"), "选段范围没有形成 3 镜队列")
  await evaluate(client, sessionId, "[...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === 'Focus' && element.getClientRects().length > 0)?.click()")
  await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('FOCUS ANALYSIS') && document.body.innerText.includes('本轮队列 1/3')"), "选段 Focus 队列范围不正确")
  await evaluate(client, sessionId, "[...document.querySelectorAll('button')].find((element) => element.textContent?.includes('跳过') && element.getClientRects().length > 0)?.click()")
  await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('本轮队列 2/3')"), "选段 Focus 第二镜未推进")
  await evaluate(client, sessionId, "[...document.querySelectorAll('button')].find((element) => element.textContent?.includes('跳过') && element.getClientRects().length > 0)?.click()")
  await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('本轮队列 3/3') && document.body.innerText.includes('本轮结束')"), "选段 Focus 最后一镜未完成")
  await evaluate(client, sessionId, `import('/src/features/project/services/projectRepository.ts').then(({ default: repository }) => repository.deleteProject('${projectId}'))`)
})

test("P3 Batch 明确选择、覆盖预览与一次确认", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId, serverPort } = await launchBrowser(context, "analysis-system-batch")
  const { projectId } = await seedProject(client, sessionId, 3)
  await client.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId)
  await navigateToProject(client, sessionId, serverPort, projectId, "stage=analyze&view=scenes")
  await until(async () => await evaluate(client, sessionId, "new URL(location.href).searchParams.get('view') === 'scenes'"), "Scenes 视图 URL 未恢复")
  await until(async () => await evaluate(client, sessionId, "[...document.querySelectorAll('button')].some((element) => element.textContent?.trim() === '维度')"), "维度面板入口未出现")
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '维度'); button?.click(); return Boolean(button) })()")
  await until(async () => await evaluate(client, sessionId, "[...document.querySelectorAll('button')].some((element) => element.textContent?.trim() === '批量记录')"), "批量记录入口未出现")
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '批量记录'); button?.click(); return Boolean(button) })()")
  await until(async () => await evaluate(client, sessionId, "document.querySelector('button[aria-label=\"关闭批量记录\"]') !== null"), "Batch 面板未打开")
  await evaluate(client, sessionId, "(() => { const box = [...document.querySelectorAll('input[type=checkbox]')].find((element) => element.getClientRects().length > 0 && !element.checked); box?.click(); return Boolean(box) })()")
  await until(async () => await evaluate(client, sessionId, "[...document.querySelectorAll('input[type=checkbox]')].filter((element) => element.getClientRects().length > 0 && element.checked).length === 1"), "Batch 第一镜选择未完成")
  await evaluate(client, sessionId, "(() => { const box = [...document.querySelectorAll('input[type=checkbox]')].filter((element) => element.getClientRects().length > 0 && !element.checked)[0]; box?.click(); return Boolean(box) })()")
  await until(async () => await evaluate(client, sessionId, "[...document.querySelectorAll('input[type=checkbox]')].filter((element) => element.getClientRects().length > 0 && element.checked).length === 2"), "Batch 镜头选择未完成")
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '大远景' && element.getClientRects().length > 0); button?.click(); return Boolean(button) })()")
  await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('将更新 2 镜')"), "Batch 覆盖预览未出现")
  await evaluate(client, sessionId, "(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '确认替换'); button?.click(); return Boolean(button) })()")
  await new Promise((resolve) => setTimeout(resolve, 700))
  const result = await evaluate(client, sessionId, `(() => import(${JSON.stringify(importRepository)}).then((module) => module.default.readProjectEditorState('${projectId}').then((state) => state.shots.map((shot) => shot.analysisFields.shot?.value ?? null))))()`)
  assert.deepEqual(result, ["shot.extreme-wide", "shot.extreme-wide", null])
  await evaluate(client, sessionId, "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))")
  await new Promise((resolve) => setTimeout(resolve, 700))
  const undone = await evaluate(client, sessionId, `(() => import(${JSON.stringify(importRepository)}).then((module) => module.default.readProjectEditorState('${projectId}').then((state) => state.shots.map((shot) => shot.analysisFields.shot?.value ?? null))))()`)
  assert.deepEqual(undone, ["shot.wide", null, null])
})

test("P3 1,000 镜头 × 20 字段记录 resolver、命令、序列化与事务耗时", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId } = await launchBrowser(context, "analysis-system-performance")
  const { projectId } = await seedProject(client, sessionId, 1)
  const report = await evaluate(client, sessionId, `(() => import(${JSON.stringify(importRepository)}).then(async ({ default: repository }) => {
    const { createProjectFieldDefinition } = await import('/src/features/template/services/fieldRegistry.ts')
    const { default: resolveAnalysisProfile } = await import('/src/features/template/services/resolveAnalysisProfile.ts')
    const { applyAnalysisBatch } = await import('/src/features/analysis/services/analysisFieldCommands.ts')
    const state = await repository.readProjectEditorState('${projectId}')
    const now = new Date().toISOString()
    const fields = Array.from({ length: 20 }, (_, index) => createProjectFieldDefinition('${projectId}', 'perf_' + index, { label: '性能字段 ' + index, description: '', kind: 'text', options: [], referenceTerms: [], allowsNotApplicable: true }))
    const usages = fields.map((field, index) => ({ fieldId: field.fieldId, sectionId: 'observations', order: index + 6, required: false, core: false, presentation: { detail_panel: { visible: true, widget: 'text', density: 'compact', showDescription: false, showReferenceTerms: false } }, interaction: { allowQuickEntry: true, allowCopyPrevious: true, allowBatchEdit: true, evidencePolicy: 'optional' } }))
    const profile = { ...state.template, fieldDefinitions: [...state.template.fieldDefinitions, ...fields], fieldUsages: [...state.template.fieldUsages, ...usages] }
    const valuesByShotId = Object.fromEntries(Array.from({ length: 1000 }, (_, shotIndex) => ['shot-' + shotIndex, Object.fromEntries(fields.map((field) => [field.fieldId, { state: 'set', value: 'existing' }]))]))
    const allShotIds = Object.keys(valuesByShotId)
    const resolverStart = performance.now()
    for (let index = 0; index < 20; index += 1) resolveAnalysisProfile(profile)
    const resolverMs = performance.now() - resolverStart
    const commandStart = performance.now()
    const commandResult = applyAnalysisBatch(profile, valuesByShotId, allShotIds, { kind: 'set', fieldId: 'perf_0', value: 'updated' })
    const commandMs = performance.now() - commandStart
    const inputStart = performance.now()
    let inputValues = {}
    for (let index = 0; index < 20; index += 1) inputValues = (await import('/src/features/analysis/services/analysisFieldCommands.ts')).applyAnalysisFieldCommand(profile, inputValues, { kind: 'set', fieldId: 'perf_' + (index % 20), value: 'typed-' + index }).values
    const inputPathMs = performance.now() - inputStart
    const { createEditorHistoryState, pushEditorHistorySnapshot } = await import('/src/features/editor/hooks/editorHistoryState.ts')
    const historyStart = performance.now()
    let history = createEditorHistoryState()
    for (let index = 0; index < 10; index += 1) history = pushEditorHistorySnapshot(history, structuredClone(commandResult.valuesByShotId), 10)
    const historyMs = performance.now() - historyStart
    const historySerializedBytes = JSON.stringify(history.past).length
    const serializationStart = performance.now()
    const serialized = JSON.stringify(commandResult.valuesByShotId)
    const serializationMs = performance.now() - serializationStart
    const transactionState = structuredClone(state)
    transactionState.project = { ...transactionState.project, title: '性能验收' }
    transactionState.shots = Array.from({ length: 1000 }, (_, index) => ({ id: 'persist-' + index, projectId: '${projectId}', order: index, startFrame: index, endFrame: index + 1, status: 'draft', detection: { source: 'manual' }, primaryScreenshotId: null, screenshotIds: [], firstFrameScreenshotId: null, lastFrameScreenshotId: null, analysisFields: Object.fromEntries(fields.map((field) => [field.fieldId, { state: 'set', value: 'persisted' }])), description: '', notes: '', createdAt: now, updatedAt: now }))
    transactionState.project.shots = 1000
    const transactionStart = performance.now()
    const saved = await repository.saveProjectEditorState(transactionState, state.project.updatedAt)
    const transactionMs = performance.now() - transactionStart
    await repository.deleteProject('${projectId}')
    return { shotCount: allShotIds.length, fieldCount: fields.length, resolverMs, commandMs, inputPathMs, historyMs, historySnapshotCount: history.past.length, historySerializedBytes, serializationMs, serializedBytes: serialized.length, transactionMs, savedTitle: saved.title }
  }))()`)
  assert.equal(report.shotCount, 1000)
  assert.equal(report.fieldCount, 20)
  assert.ok(Number.isFinite(report.inputPathMs))
  assert.equal(report.historySnapshotCount, 10)
  assert.ok(report.historySerializedBytes > 0)
  assert.ok(report.serializedBytes > 0)
  assert.equal(report.savedTitle, "性能验收")
  console.log("analysis-system-performance", JSON.stringify(report))
})

test("P3 Focus/Batch 在宽、中、窄视口处理 IME、重复键与 Escape", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId, serverPort } = await launchBrowser(context, "analysis-system-responsive")
  const { projectId } = await seedProject(client, sessionId, 4)
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await client.send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 500 }, sessionId)
    await navigateToProject(client, sessionId, serverPort, projectId, "stage=analyze&view=scenes")
    if (viewport.width <= 1100) {
      await until(async () => await evaluate(client, sessionId, "document.querySelector('.editor-workspace')?.getAttribute('data-mobile-panel') === 'analysis' || [...document.querySelectorAll('.editor-mobile-panel-switcher button')].some((element) => element.textContent?.trim() === '分析')"), `${viewport.width} 视口分析面板切换入口未出现`)
      const analysisPanelOpen = await evaluate(client, sessionId, "document.querySelector('.editor-workspace')?.getAttribute('data-mobile-panel') === 'analysis'")
      if (!analysisPanelOpen) await evaluate(client, sessionId, "[...document.querySelectorAll('.editor-mobile-panel-switcher button')].find((element) => element.textContent?.trim() === '分析')?.click()")
    }
    await until(async () => await evaluate(client, sessionId, "[...document.querySelectorAll('button')].some((element) => element.textContent?.trim() === '维度' && element.getClientRects().length > 0)"), `${viewport.width} 视口维度面板未出现`)
    await evaluate(client, sessionId, "[...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '维度' && element.getClientRects().length > 0)?.click()")
    await until(async () => await evaluate(client, sessionId, "[...document.querySelectorAll('button')].some((element) => element.textContent?.trim() === '批量记录' && element.getClientRects().length > 0)"), `${viewport.width} 视口批量入口未出现`)
    await evaluate(client, sessionId, "[...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === '批量记录' && element.getClientRects().length > 0)?.click()")
    await until(async () => await evaluate(client, sessionId, "document.querySelector('button[aria-label=\"关闭批量记录\"]') !== null"), `${viewport.width} 视口 Batch 面板未打开`)
    await evaluate(client, sessionId, "document.querySelector('button[aria-label=\"关闭批量记录\"]')?.click()")
    await navigateToProject(client, sessionId, serverPort, projectId, "stage=analyze&view=shots&mode=sequential")
    await until(async () => await evaluate(client, sessionId, "new URL(location.href).searchParams.get('view') === 'shots'"), `${viewport.width} 视口 Shots 未加载`)
    await until(async () => await evaluate(client, sessionId, "[...document.querySelectorAll('button')].some((element) => element.textContent?.trim() === 'Focus' && element.getClientRects().length > 0)"), `${viewport.width} 视口 Focus 入口未出现`)
    await evaluate(client, sessionId, "[...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === 'Focus' && element.getClientRects().length > 0)?.click()")
    await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('FOCUS ANALYSIS')"), `${viewport.width} 视口 Focus 未打开`)
    const composingQueue = await evaluate(client, sessionId, "(() => { const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }); Object.defineProperty(event, 'isComposing', { value: true }); window.dispatchEvent(event); return document.body.innerText.match(/本轮队列[^\\n]*/)?.[0] ?? '' })()")
    assert.match(composingQueue, /1\/4/)
    const repeatQueue = await evaluate(client, sessionId, "(() => { const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, repeat: true }); window.dispatchEvent(event); return document.body.innerText.match(/本轮队列[^\\n]*/)?.[0] ?? '' })()")
    assert.match(repeatQueue, /1\/4/)
    await evaluate(client, sessionId, "document.activeElement?.blur(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))")
    await until(async () => await evaluate(client, sessionId, "document.body.innerText.includes('本轮队列 2/4')"), `${viewport.width} 视口正常方向键未推进 Focus`)
    await evaluate(client, sessionId, "window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))")
    await until(async () => await evaluate(client, sessionId, "!document.body.innerText.includes('FOCUS ANALYSIS')"), `${viewport.width} 视口 Focus Escape 未关闭`)
    await evaluate(client, sessionId, "document.querySelector('[aria-label=\"打开临时用户菜单\"]')?.click()")
    await until(async () => await evaluate(client, sessionId, "document.querySelector('[data-slot=\"dropdown-menu-content\"][data-open]') !== null"), `${viewport.width} 视口菜单未打开`)
    await evaluate(client, sessionId, "document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))")
    await until(async () => await evaluate(client, sessionId, "document.querySelector('[data-slot=\"dropdown-menu-content\"][data-open]') === null"), `${viewport.width} 视口菜单 Escape 未关闭`)
  }
  await evaluate(client, sessionId, `import(${JSON.stringify(importRepository)}).then(({ default: repository }) => repository.deleteProject('${projectId}'))`)
})
