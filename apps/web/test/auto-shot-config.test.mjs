import assert from "node:assert/strict"
import { resolve } from "node:path"
import test from "node:test"
import { createServer } from "vite"

const webRoot = resolve(import.meta.dirname, "..")
const vite = await createServer({ root: webRoot, appType: "custom", logLevel: "silent", server: { middlewareMode: true } })
const { getResearchPresetRegistry, resolveAutoShotConfig } = await vite.ssrLoadModule("/src/features/auto-shot/config/resolveAutoShotConfig.ts")

function settings(presetId, detail, transitions) {
  return { schemaVersion: 1, presetId, detail, transitions, minimumSceneDuration: { mode: "preset" }, overrides: {} }
}

test.after(async () => vite.close())

test("研究 catalog 暴露四个内容预设，通用与影视统一为 general", () => {
  assert.deepEqual(Object.keys(getResearchPresetRegistry()).sort(), [
    "animation-gameplay",
    "general",
    "short-form",
    "talking-head",
  ])
  const resolved = resolveAutoShotConfig(settings("general", "balanced", "hard-cuts"))
  assert.equal(resolved.summary.presetName, "通用/影视")
})

test("研究 catalog 的所有 preset/detail/transition 组合都产生合法配置", () => {
  for (const presetId of Object.keys(getResearchPresetRegistry())) {
    for (const detail of ["conservative", "balanced", "detailed"]) {
      for (const transitions of ["hard-cuts", "hard-cuts-and-fades"]) {
        const resolved = resolveAutoShotConfig(settings(presetId, detail, transitions))
        assert.equal(resolved.settings.preset.catalog, "research")
        assert.equal(resolved.settings.preset.id, presetId)
        assert.equal(resolved.summary.calibrationLabel, "待标定")
        assert.equal(resolved.engineConfig.analysis.maxWidth, 96)
      }
    }
  }
})

test("production catalog 只解析已晋升 preset，不能解析 research-only preset", () => {
  const promoted = resolveAutoShotConfig(settings("general", "balanced", "hard-cuts"), "production")
  assert.equal(promoted.settings.preset.catalog, "production")
  assert.throws(() => resolveAutoShotConfig(settings("talking-head", "balanced", "hard-cuts"), "production"), (error) => error?.name === "AutoShotConfigError" && error.issue.code === "UNKNOWN_PRESET")
})

test("高级 hard-cut 覆盖会完整替换 detector 并改变 canonical hash", () => {
  const base = resolveAutoShotConfig(settings("general", "balanced", "hard-cuts"))
  const overridden = resolveAutoShotConfig({ ...settings("general", "balanced", "hard-cuts"), overrides: { hardCut: { kind: "content", threshold: 1800, weights: { hue: 3333, saturation: 3333, luma: 3334 } } } })
  assert.equal(base.engineConfig.hardCut.kind, "adaptive")
  assert.equal(overridden.engineConfig.hardCut.kind, "content")
  assert.notEqual(base.configHash, overridden.configHash)
})

test("非法自定义时长和 fade 冲突都会产生结构化错误", () => {
  assert.throws(() => resolveAutoShotConfig({ ...settings("general", "balanced", "hard-cuts"), minimumSceneDuration: { mode: "custom", seconds: 0.01 } }), (error) => error?.name === "AutoShotConfigError" && error.issue.path === "minimumSceneDuration.seconds")
  assert.throws(() => resolveAutoShotConfig({ ...settings("general", "balanced", "hard-cuts"), overrides: { fade: { mode: "floor", threshold: 12, bias: 0, emitFinalFade: false } } }), (error) => error?.name === "AutoShotConfigError" && error.issue.path === "overrides.fade")
})
