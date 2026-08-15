import { useCallback, useEffect, useRef, useState } from "react";

interface UseEditorHistoryOptions<TSnapshot> {
  getSnapshot: () => TSnapshot;
  onRestore: (snapshot: TSnapshot) => void;
  limit?: number;
}

export default function useEditorHistory<TSnapshot>({ getSnapshot, onRestore, limit = 100 }: UseEditorHistoryOptions<TSnapshot>) {
  const pastRef = useRef<TSnapshot[]>([]);
  const futureRef = useRef<TSnapshot[]>([]);
  const getSnapshotRef = useRef(getSnapshot);
  const onRestoreRef = useRef(onRestore);
  const [state, setState] = useState({ canUndo: false, canRedo: false });

  useEffect(() => { getSnapshotRef.current = getSnapshot; }, [getSnapshot]);
  useEffect(() => { onRestoreRef.current = onRestore; }, [onRestore]);

  const syncState = useCallback(() => {
    setState({ canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0 });
  }, []);

  const push = useCallback((snapshot: TSnapshot) => {
    pastRef.current = [...pastRef.current, snapshot].slice(-limit);
    futureRef.current = [];
    syncState();
  }, [limit, syncState]);

  const commit = useCallback(() => push(getSnapshotRef.current()), [push]);

  const undo = useCallback(() => {
    const previous = pastRef.current.pop();
    if (!previous) return false;
    futureRef.current.unshift(getSnapshotRef.current());
    onRestoreRef.current(previous);
    syncState();
    return true;
  }, [syncState]);

  const redo = useCallback(() => {
    const next = futureRef.current.shift();
    if (!next) return false;
    pastRef.current.push(getSnapshotRef.current());
    onRestoreRef.current(next);
    syncState();
    return true;
  }, [syncState]);

  const reset = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    syncState();
  }, [syncState]);

  return { ...state, commit, push, undo, redo, reset };
}
