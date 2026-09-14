import assert from "node:assert/strict"
import test from "node:test"
import {
  createEditorHistoryState,
  pushEditorHistorySnapshot,
  redoEditorHistory,
  undoEditorHistory,
} from "../src/features/editor/hooks/editorHistoryState.ts"

test("editor history undoes and redoes without mutating the source state", () => {
  const initial = createEditorHistoryState<string>()
  const withFirst = pushEditorHistorySnapshot(initial, "first", 100)
  const withSecond = pushEditorHistorySnapshot(withFirst, "second", 100)

  const undone = undoEditorHistory(withSecond, "current")
  assert.equal(undone.snapshot, "second")
  assert.deepEqual(undone.state, { past: ["first"], future: ["current"] })
  assert.deepEqual(withSecond, { past: ["first", "second"], future: [] })

  const redone = redoEditorHistory(undone.state, "second", 100)
  assert.equal(redone.snapshot, "current")
  assert.deepEqual(redone.state, { past: ["first", "second"], future: [] })
})

test("a new edit after undo clears redo history", () => {
  const state = pushEditorHistorySnapshot(
    pushEditorHistorySnapshot(createEditorHistoryState<number>(), 1, 100),
    2,
    100,
  )
  const undone = undoEditorHistory(state, 3)
  const branched = pushEditorHistorySnapshot(undone.state, 4, 100)

  assert.deepEqual(branched, { past: [1, 4], future: [] })
  assert.equal(redoEditorHistory(branched, 5, 100).snapshot, null)
})

test("history keeps the newest snapshots within the configured limit", () => {
  let state = createEditorHistoryState<number>()
  for (const snapshot of [1, 2, 3, 4]) {
    state = pushEditorHistorySnapshot(state, snapshot, 2)
  }
  assert.deepEqual(state, { past: [3, 4], future: [] })
})

test("redo also keeps the past history within the configured limit", () => {
  const redone = redoEditorHistory({ past: [1, 2], future: [3] }, 4, 2)

  assert.equal(redone.snapshot, 3)
  assert.deepEqual(redone.state, { past: [2, 4], future: [] })
})
