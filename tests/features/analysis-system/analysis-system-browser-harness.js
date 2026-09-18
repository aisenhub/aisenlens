import { evaluate, launchBrowser, until } from "../shot-calibration/calibration-browser-harness.js"

export const importRepository = "/src/features/project/services/projectRepository.ts"

export async function attachPage(client, serverPort, label) {
  const target = await client.send("Target.createTarget", { url: `http://127.0.0.1:${serverPort}/projects`, newWindow: false })
  const attached = await client.send("Target.attachToTarget", { targetId: target.targetId, flatten: true })
  await client.send("Runtime.enable", {}, attached.sessionId)
  await client.send("Page.enable", {}, attached.sessionId)
  await until(async () => await evaluate(client, attached.sessionId, "document.body.innerText.includes('项目库')"), `${label} 项目库未加载`)
  return attached.sessionId
}

export async function navigateToProject(client, sessionId, serverPort, projectId, query = "workspace=analysis&view=scenes") {
  const expectedParams = [...new URLSearchParams(query).entries()]
  const readyExpression = ["location.pathname === '/app'", ...expectedParams.map(([key, value]) => `new URL(location.href).searchParams.get(${JSON.stringify(key)}) === ${JSON.stringify(value)}`)].join(" && ")
  void client.send("Page.navigate", { url: `http://127.0.0.1:${serverPort}/app?project=${projectId}&${query}` }, sessionId).catch(() => undefined)
  await until(async () => await evaluate(client, sessionId, readyExpression), `项目页未加载：${query}`)
}

export async function seedProject(client, sessionId, shotCount = 3) {
  return evaluate(client, sessionId, `(() => import(${JSON.stringify(importRepository)}).then(async ({ default: repository }) => {
    const { loadOrCreateProjectTemplate } = await import('/src/features/template/services/templateService.ts')
    const { buildShotAnalysisRecords } = await import('/src/features/analysis/services/analysisRecordService.ts')
    const project = await repository.createProject({ title: '分析系统验收项目' })
    const template = await loadOrCreateProjectTemplate(project.id)
    const now = new Date().toISOString()
    const shots = Array.from({ length: ${shotCount} }, (_, index) => ({
      id: crypto.randomUUID(), projectId: project.id, order: index, startFrame: index * 24, endFrame: index * 24 + 24,
      status: 'draft', detection: { source: 'manual' }, primaryScreenshotId: null, screenshotIds: [], firstFrameScreenshotId: null, lastFrameScreenshotId: null,
      revision: 1, structureRevision: project.structureRevision + 1, lineage: { origin: 'manual', parentShotIds: [] }, createdAt: now, updatedAt: now,
    }))
    const analysisRecords = buildShotAnalysisRecords({
      projectId: project.id,
      entriesByShotId: shots[0] ? { [shots[0].id]: { shot: { state: 'set', value: 'shot.wide' } } } : {},
      notesByShotId: shots[0] ? { [shots[0].id]: { content: '初始描述', analysis: '初始笔记' } } : {},
      existingRecords: [], activeShotIds: shots.map((shot) => shot.id), profile: template,
      structureRevision: project.structureRevision + 1, now,
    })
    const state = { project, shots, groups: [], markers: [], template, researchRanges: [], researchContexts: [], analysisRecords, analysisCandidates: [], analysisEvidence: [], analysisContextManifests: [] }
    const saved = await repository.saveProjectEditorState(state, project.updatedAt)
    return { projectId: project.id, updatedAt: saved.updatedAt, shotIds: shots.map((shot) => shot.id) }
  }))()`)
}
