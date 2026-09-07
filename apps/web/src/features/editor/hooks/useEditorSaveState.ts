import { useCallback, useEffect, useRef, useState } from "react";

export type EditorSaveStatus = "saved" | "unsaved" | "saving" | "error";

interface UseEditorSaveStateOptions {
  projectId: string;
  save: () => Promise<void>;
  autoSaveDelay?: number;
}

export default function useEditorSaveState({ projectId, save, autoSaveDelay = 400 }: UseEditorSaveStateOptions) {
  const [status, setStatus] = useState<EditorSaveStatus>("saved");
  const saveRef = useRef(save);
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const clearScheduledSave = useCallback(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const saveNow = useCallback(async () => {
    clearScheduledSave();
    if (savePromiseRef.current) return savePromiseRef.current;
    if (savedRevisionRef.current >= revisionRef.current) return;

    const savePromise = (async () => {
      setStatus("saving");
      try {
        while (savedRevisionRef.current < revisionRef.current) {
          const revision = revisionRef.current;
          await saveRef.current();
          savedRevisionRef.current = revision;
        }
        setStatus("saved");
      } catch (error) {
        setStatus("error");
        throw error;
      } finally {
        savePromiseRef.current = null;
      }
    })();
    savePromiseRef.current = savePromise;
    return savePromise;
  }, [clearScheduledSave]);

  const requestAutoSave = useCallback(() => {
    clearScheduledSave();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void saveNow().catch(() => undefined);
    }, autoSaveDelay);
  }, [autoSaveDelay, clearScheduledSave, saveNow]);

  const markDirty = useCallback(() => {
    revisionRef.current += 1;
    if (!savePromiseRef.current) setStatus("unsaved");
    requestAutoSave();
  }, [requestAutoSave]);

  useEffect(() => {
    revisionRef.current = 0;
    savedRevisionRef.current = 0;
    clearScheduledSave();
    setStatus("saved");
  }, [clearScheduledSave, projectId]);

  useEffect(() => () => clearScheduledSave(), [clearScheduledSave]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (revisionRef.current <= savedRevisionRef.current && !savePromiseRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") void saveNow().catch(() => undefined);
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("visibilitychange", saveWhenHidden);
    };
  }, [saveNow]);

  return { status, isDirty: status !== "saved", markDirty, requestAutoSave, saveNow };
}
