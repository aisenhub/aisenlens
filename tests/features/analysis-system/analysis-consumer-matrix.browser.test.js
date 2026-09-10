import assert from "node:assert/strict"
import test from "node:test"
import { browserPath, evaluate, launchBrowser } from "../shot-calibration/calibration-browser-harness.js"

test("P5 Overlay/Export/Learn/Evidence 新模型消费矩阵与边界场景", { timeout: 120_000 }, async (context) => {
  assert.ok(browserPath, "未找到 Chrome 或 Edge；可通过 AISENLENS_CHROME_PATH 指定浏览器路径。")
  const { client, sessionId } = await launchBrowser(context, "analysis-consumer-matrix")
  const result = await evaluate(client, sessionId, `(() => Promise.all([
    import('/src/features/content-overlay/services/contentOverlayResolver.ts'),
    import('/src/features/export/services/reportExportService.ts'),
    import('/src/features/learn/services/deriveLearningSources.ts'),
    import('/src/hooks/useAppTheme.ts'),
  ]).then(async ([overlayModule, exportModule, learningModule, themeModule]) => {
    const field = {
      definition: { fieldId: 'shot', label: '景别', kind: 'single-select', options: [{ id: 'shot.wide', label: '远景' }, { id: 'shot.close', label: '近景' }], referenceTerms: [], allowsNotApplicable: true },
      usage: { order: 1, presentation: { report: { visible: true } } },
      surface: { visible: true },
      issues: [],
    }
    const range = { id: 'range-1', projectId: 'project-1', mediaIdentityDigest: 'media-1', startUs: 1000000, endUs: 3000000, title: '研究范围', observation: '观察', interpretation: '解释', summary: '摘要', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', revision: 1 }
    const context = { id: 'context-1', projectId: 'project-1', target: { kind: 'range', id: range.id }, question: '为什么这样剪？', status: 'completed', needsReview: false, needsReviewReasons: [], structureRevision: 1, evidence: [{ id: 'evidence-1', kind: 'time-range', mediaIdentityDigest: 'media-1', startUs: range.startUs, endUs: range.endUs }], createdAt: range.createdAt, updatedAt: range.updatedAt, revision: 1 }
    const shot = { id: 'shot-1', start: 1, duration: 2, description: '画面描述', notes: '分析笔记', analysisFields: { shot: { state: 'set', value: 'shot.wide' } }, screenshotId: null }
    const input = { projectTitle: '消费端矩阵', fields: [field], shots: [shot], groups: [], screenshotUrls: {}, researchRanges: [range], researchContexts: [context] }
    const overlay = overlayModule.resolveContentOverlay({ settings: { enabled: true, fieldIds: ['shot'], showShotNumber: true, showTimecode: true, showDuration: true, showDescription: true, showAnalysis: true, position: 'top-left', showBackground: true, backgroundOpacity: 0.7 }, fields: [field], values: shot.analysisFields, description: shot.description, analysis: shot.notes, shotIndex: 0, currentTimecode: '00:01.00', durationSeconds: shot.duration })
    const csv = exportModule.createReportCsv(input)
    const html = exportModule.createReportHtml(input)
    const sources = learningModule.default({ shots: [{ id: shot.id, start: shot.start, duration: shot.duration }], groups: [{ id: 'group-1', projectId: 'project-1', title: '段落一', shotIds: [shot.id], summary: '段落摘要' }], notes: { [shot.id]: { content: '', analysis: '镜头分析' } }, researchRanges: [range], researchContexts: [context] })
    const emptyHtml = exportModule.createReportHtml({ ...input, shots: [], groups: [], researchRanges: [], researchContexts: [] })
    const descriptionOnly = overlayModule.resolveContentOverlay({ settings: { enabled: true, fieldIds: [], showShotNumber: false, showTimecode: false, showDuration: false, showDescription: true, showAnalysis: true, position: 'top-left', showBackground: false, backgroundOpacity: 0 }, fields: [], values: {}, description: '只有画面描述', analysis: '', shotIndex: 0, currentTimecode: '00:00.00', durationSeconds: 1 })
    return { overlay, csv, html, sourceKinds: sources.map((source) => source.kind), rangeExcerpt: sources.at(-1)?.excerpt ?? '', emptyHtml, descriptionOnly, theme: { normalized: themeModule.normalizeThemePreference('unexpected'), systemDark: themeModule.resolveThemePreference('system', 'dark'), light: themeModule.resolveThemePreference('light', 'dark') } }
  }))()`)
  assert.deepEqual(result.overlay.items, [{ id: "shot", label: "景别", value: "远景" }])
  assert.equal(result.overlay.shotNumber, "SHOT 01")
  assert.equal(result.overlay.description, "画面描述")
  assert.match(result.csv, /远景/)
  assert.match(result.csv, /研究范围/)
  assert.match(result.csv, /证据数/)
  assert.doesNotMatch(result.csv, /shot\.wide/)
  assert.match(result.html, /远景/)
  assert.match(result.html, /研究附录/)
  assert.match(result.html, /为什么这样剪？/)
  assert.deepEqual(result.sourceKinds, ["shot", "group", "range"])
  assert.match(result.rangeExcerpt, /为什么这样剪？/)
  assert.match(result.emptyHtml, /暂无分镜数据/)
  assert.deepEqual(result.descriptionOnly.items, [])
  assert.equal(result.descriptionOnly.description, "只有画面描述")
  assert.equal(result.descriptionOnly.analysis, null)
  assert.deepEqual(result.theme, { normalized: "dark", systemDark: "dark", light: "light" })
})
