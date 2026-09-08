import assert from "node:assert/strict"
import test from "node:test"
import { createProjectEditorStore } from "../../../apps/web/src/features/editor/stores/createProjectEditorStore.ts"

test("project editor store is scoped by project and keeps low-frequency selection", () => {
  const first = createProjectEditorStore("project-a")
  const second = createProjectEditorStore("project-b")
  first.getState().setSelection({ shotId: "shot-a" })
  first.getState().setPlaybackTime(12.5)
  assert.equal(first.getState().selectedShotId, "shot-a")
  assert.equal(first.getState().playbackTime, 12.5)
  assert.equal(second.getState().selectedShotId, null)
  assert.equal(second.getState().projectId, "project-b")
})

test("document revision is explicit and playback does not create a revision", () => {
  const store = createProjectEditorStore("project-a")
  store.getState().setPlaybackTime(2)
  assert.equal(store.getState().documentRevision, 0)
  store.getState().bumpDocumentRevision()
  assert.equal(store.getState().documentRevision, 1)
})
