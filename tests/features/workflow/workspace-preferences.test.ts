import assert from "node:assert/strict"
import test from "node:test"
import {
  NATIVE_STUDIO_PREFERENCE_KEY,
  createDefaultNativeStudioPreferences,
  normalizeNativeStudioPreferences,
  readNativeStudioPreferences,
  writeNativeStudioPreferences,
} from "../../../apps/webapp/src/features/workflow/services/workspacePreferenceService.ts"
import {
  resolveKeyboardResizedPanelWidth,
  resolveKeyboardResizedTimelineHeight,
  resolvePointerResizedPanelWidth,
  resolvePointerResizedTimelineHeight,
} from "../../../apps/webapp/src/features/workflow/services/workspacePanelGeometry.ts"

class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

test("Native Studio preferences clamp panel geometry and reject cross-workspace lastView", () => {
  const normalized = normalizeNativeStudioPreferences({
    railExpanded: true,
    workspaces: {
      analysis: {
        density: "compact",
        navigationWidth: 999,
        inspectorWidth: 100,
        timelineHeight: 999,
        inspectorOpen: false,
        navigationOpen: false,
        collectionView: "grid",
        lastView: "creative",
      },
    },
  })
  assert.equal(normalized.railExpanded, true)
  assert.equal(normalized.workspaces.analysis.navigationWidth, 360)
  assert.equal(normalized.workspaces.analysis.inspectorWidth, 280)
  assert.equal(normalized.workspaces.analysis.timelineHeight, 360)
  assert.equal(normalized.workspaces.analysis.navigationOpen, false)
  assert.equal(normalized.workspaces.analysis.collectionView, "grid")
  assert.equal(normalized.workspaces.analysis.lastView, null)
})

test("Native Studio preferences persist outside project canonical data", () => {
  const storage = new MemoryStorage()
  const defaults = createDefaultNativeStudioPreferences()
  const next = { ...defaults, railExpanded: true }
  writeNativeStudioPreferences(next, storage)
  assert.equal(JSON.parse(storage.getItem(NATIVE_STUDIO_PREFERENCE_KEY) ?? "{}").version, 1)
  assert.equal(readNativeStudioPreferences(storage).railExpanded, true)
  storage.setItem(NATIVE_STUDIO_PREFERENCE_KEY, "not-json")
  assert.deepEqual(readNativeStudioPreferences(storage), defaults)
})

test("workspace panel resize geometry respects side, keyboard direction and clamps", () => {
  assert.equal(resolvePointerResizedPanelWidth({ side: "left", startWidth: 240, deltaX: 24, minWidth: 180, maxWidth: 360 }), 264)
  assert.equal(resolvePointerResizedPanelWidth({ side: "right", startWidth: 320, deltaX: 24, minWidth: 280, maxWidth: 480 }), 296)
  assert.equal(resolveKeyboardResizedPanelWidth({ key: "ArrowRight", side: "left", currentWidth: 240, defaultWidth: 240, minWidth: 180, maxWidth: 360 }), 248)
  assert.equal(resolveKeyboardResizedPanelWidth({ key: "ArrowLeft", side: "right", currentWidth: 320, defaultWidth: 320, minWidth: 280, maxWidth: 480 }), 328)
  assert.equal(resolveKeyboardResizedPanelWidth({ key: "Home", side: "left", currentWidth: 360, defaultWidth: 240, minWidth: 180, maxWidth: 360 }), 240)
  assert.equal(resolveKeyboardResizedPanelWidth({ key: "Enter", side: "left", currentWidth: 240, defaultWidth: 240, minWidth: 180, maxWidth: 360 }), null)
  assert.equal(resolvePointerResizedTimelineHeight({ startHeight: 192, deltaY: -24, minHeight: 120, maxHeight: 360 }), 216)
  assert.equal(resolveKeyboardResizedTimelineHeight({ key: "ArrowUp", currentHeight: 192, defaultHeight: 192, minHeight: 120, maxHeight: 360 }), 200)
  assert.equal(resolveKeyboardResizedTimelineHeight({ key: "Home", currentHeight: 260, defaultHeight: 192, minHeight: 120, maxHeight: 360 }), 192)
})
