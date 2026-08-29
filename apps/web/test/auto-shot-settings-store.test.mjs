import assert from "node:assert/strict"
import test from "node:test"
import { autoShotSettingsKey, useAutoShotSettingsStore } from "../src/features/auto-shot/stores/useAutoShotSettingsStore.ts"

const key = autoShotSettingsKey("project-1", "sha256:media-1")

test.after(() => useAutoShotSettingsStore.setState({ drafts: {} }))

test("设置草稿按项目与媒体身份隔离且只保存小型配置", () => {
  useAutoShotSettingsStore.getState().initialize(key)
  useAutoShotSettingsStore.getState().update(key, { detail: "detailed", transitions: "hard-cuts-and-fades" })
  const draft = useAutoShotSettingsStore.getState().drafts[key]
  assert.equal(draft.settings.presetId, "general")
  assert.equal(draft.settings.detail, "detailed")
  assert.equal(draft.settings.transitions, "hard-cuts-and-fades")
  assert.equal(draft.dirty, true)
  assert.equal("blob" in draft, false)
  assert.equal(useAutoShotSettingsStore.getState().drafts[autoShotSettingsKey("project-2", "sha256:media-1")], undefined)
})

test("重置只清理当前草稿并回到同一基础预设", () => {
  useAutoShotSettingsStore.getState().reset(key)
  const draft = useAutoShotSettingsStore.getState().drafts[key]
  assert.equal(draft.settings.detail, "balanced")
  assert.equal(draft.settings.presetId, "general")
  assert.equal(draft.dirty, false)
})
