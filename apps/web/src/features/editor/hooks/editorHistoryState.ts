export interface EditorHistoryState<TSnapshot> {
  past: TSnapshot[]
  future: TSnapshot[]
}

export interface EditorHistoryTransition<TSnapshot> {
  state: EditorHistoryState<TSnapshot>
  snapshot: TSnapshot | null
}

export function createEditorHistoryState<TSnapshot,>(): EditorHistoryState<TSnapshot> {
  return { past: [], future: [] }
}

export function pushEditorHistorySnapshot<TSnapshot>(
  state: EditorHistoryState<TSnapshot>,
  snapshot: TSnapshot,
  limit: number,
): EditorHistoryState<TSnapshot> {
  const normalizedLimit = Math.max(1, Math.floor(limit))
  return {
    past: [...state.past, snapshot].slice(-normalizedLimit),
    future: [],
  }
}

export function undoEditorHistory<TSnapshot>(
  state: EditorHistoryState<TSnapshot>,
  currentSnapshot: TSnapshot,
): EditorHistoryTransition<TSnapshot> {
  if (state.past.length === 0) return { state, snapshot: null }
  const past = [...state.past]
  const snapshot = past.pop() as TSnapshot
  return {
    state: { past, future: [currentSnapshot, ...state.future] },
    snapshot,
  }
}

export function redoEditorHistory<TSnapshot>(
  state: EditorHistoryState<TSnapshot>,
  currentSnapshot: TSnapshot,
  limit: number,
): EditorHistoryTransition<TSnapshot> {
  if (state.future.length === 0) return { state, snapshot: null }
  const future = [...state.future]
  const snapshot = future.shift() as TSnapshot
  const normalizedLimit = Math.max(1, Math.floor(limit))
  return {
    state: {
      past: [...state.past, currentSnapshot].slice(-normalizedLimit),
      future,
    },
    snapshot,
  }
}
