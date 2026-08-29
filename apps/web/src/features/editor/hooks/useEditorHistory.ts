import { useCallback, useEffect, useRef, useState } from "react"
import {
  createEditorHistoryState,
  pushEditorHistorySnapshot,
  redoEditorHistory,
  undoEditorHistory,
} from "./editorHistoryState"

interface UseEditorHistoryOptions<TSnapshot> {
  getSnapshot: () => TSnapshot

  onRestore: (snapshot: TSnapshot) => void

  limit?: number
}

export default function useEditorHistory<TSnapshot>({
  getSnapshot,
  onRestore,
  limit = 100,
}: UseEditorHistoryOptions<TSnapshot>) {
  const historyRef = useRef(createEditorHistoryState<TSnapshot>())
  const getSnapshotRef = useRef(getSnapshot)

  const onRestoreRef = useRef(onRestore)

  const [state, setState] = useState({ canUndo: false, canRedo: false })

  useEffect(() => {
    getSnapshotRef.current = getSnapshot
  }, [getSnapshot])

  useEffect(() => {
    onRestoreRef.current = onRestore
  }, [onRestore])

  const syncState = useCallback(() => {
    setState({
      canUndo: historyRef.current.past.length > 0,
      canRedo: historyRef.current.future.length > 0,
    })
  }, [])

  const push = useCallback(
    (snapshot: TSnapshot) => {
      historyRef.current = pushEditorHistorySnapshot(
        historyRef.current,
        snapshot,
        limit,
      )
      syncState()
    },
    [limit, syncState],
  )

  const commit = useCallback(() => push(getSnapshotRef.current()), [push])

  const undo = useCallback(() => {
    const transition = undoEditorHistory(
      historyRef.current,
      getSnapshotRef.current(),
    )
    if (!transition.snapshot) return false
    historyRef.current = transition.state
    onRestoreRef.current(transition.snapshot)
    syncState()
    return true
  }, [syncState])

  const redo = useCallback(() => {
    const transition = redoEditorHistory(
      historyRef.current,
      getSnapshotRef.current(),
      limit,
    )
    if (!transition.snapshot) return false
    historyRef.current = transition.state
    onRestoreRef.current(transition.snapshot)
    syncState()
    return true
  }, [limit, syncState])

  const reset = useCallback(() => {
    historyRef.current = createEditorHistoryState<TSnapshot>()
    syncState()
  }, [syncState])

  return { ...state, commit, push, undo, redo, reset }
}
