import { useEffect, useRef, useState } from "react"
import type { AutoShotMediaIdentity } from "../../auto-shot/mediaIdentity"
import type { AutoShotTaskRecord } from "../../auto-shot/types"
import type { StoredShotRecord, MediaSourceFingerprint } from "../../project/types"
import projectRepository from "../../project/services/projectRepository"
import { createCalibrationDraft, formalShotsSignature, shouldSeedCalibrationFromDetection } from "../services/calibrationDraftService"
import { createCalibrationStore, type CalibrationStore } from "../stores/createCalibrationStore"
import type { CalibrationDraft } from "../types"

interface UseCalibrationSessionInput {
  projectId: string
  mediaIdentity: AutoShotMediaIdentity | null
  mediaSource: MediaSourceFingerprint | null
  frameRate: number
  totalFrames: number
  timingMode?: "cfr" | "vfr"
  presentationTimestamps?: readonly number[]
  presentationDurations?: readonly number[]
  baseProjectUpdatedAt: string
  task: AutoShotTaskRecord | null
  shots: readonly StoredShotRecord[]
}

export default function useCalibrationSession(input: UseCalibrationSessionInput) {
  const storeRef = useRef<CalibrationStore | null>(null)
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [, setStoreVersion] = useState(0)
  const persistedRevisionRef = useRef<number | undefined>(undefined)
  const saveQueueRef = useRef(Promise.resolve())

  useEffect(() => {
    let cancelled = false
    if (!input.mediaIdentity || input.totalFrames <= 0) {
      storeRef.current = null
      setState("idle")
      return
    }
    // EditorWorkspace loads formal shots asynchronously. Do not create a
    // fallback full-film draft while that load is still in flight; otherwise
    // a completed auto-shot task is evaluated against an empty shot list and
    // its detected boundaries are lost for the rest of the session.
    if (input.shots.length === 0) {
      storeRef.current = null
      setState("loading")
      return
    }
    setState("loading")
    setError(null)
    const mediaIdentity = input.mediaIdentity
    void (async () => {
      try {
        const stored = await projectRepository.getCalibrationDraft(input.projectId, mediaIdentity)
        if (cancelled) return
        const baseShotsChanged = stored ? stored.baseFormalShotsSignature !== formalShotsSignature(input.shots) : false
        const baseTaskChanged = stored ? stored.baseTaskUpdatedAt !== (input.task?.updatedAt ?? null) : false
        const useDetectionTask = shouldSeedCalibrationFromDetection(input.task, input.shots)
        const storedMatchesDetectionTask = !useDetectionTask || (stored?.initialSource === "detection" && stored.baseTaskId === input.task?.id)
        const draft = stored?.status === "editing" && stored.baseProjectUpdatedAt !== input.baseProjectUpdatedAt && (baseShotsChanged || baseTaskChanged)
          ? { ...stored, status: "conflict" as const }
          : stored?.status === "editing" && storedMatchesDetectionTask
            ? stored
            : createCalibrationDraft({ ...input, mediaIdentity, task: useDetectionTask ? input.task : null })
        const store = createCalibrationStore(draft)
        storeRef.current = store
        persistedRevisionRef.current = stored?.revision
        setSaveState(stored ? "saved" : "idle")
        setState("ready")
      } catch (cause) {
        if (cancelled) return
      setState("error")
      setSaveState("error")
        setError(cause instanceof Error ? cause.message : "无法加载校准草稿。")
      }
    })()
    return () => { cancelled = true }
  }, [input.baseProjectUpdatedAt, input.mediaIdentity, input.projectId, input.shots.length, input.task?.id, input.totalFrames])

  const store = storeRef.current
  const current = store?.getState()
  const draft = current?.draft ?? null
  const canUndo = (current?.past.length ?? 0) > 0
  const canRedo = (current?.future.length ?? 0) > 0

  useEffect(() => {
    if (!store) return
    const unsubscribe = store.subscribe(() => setStoreVersion((version) => version + 1))
    return unsubscribe
  }, [store])

  return {
    state,
    error,
    draft,
    canUndo,
    canRedo,
    dispatch: store?.getState().dispatch,
    undo: store?.getState().undo,
    redo: store?.getState().redo,
    replace: store?.getState().replace,
    save: async () => {
      const current = store?.getState().draft
      if (!current) return
      const saveOperation = saveQueueRef.current.then(async () => {
        setSaveState("saving")
        try {
          await projectRepository.saveCalibrationDraft(current, persistedRevisionRef.current)
          persistedRevisionRef.current = current.revision
          setSaveState("saved")
        } catch (cause) {
          setSaveState("error")
          throw cause
        }
      })
      saveQueueRef.current = saveOperation.catch(() => undefined)
      return saveOperation
    },
    saveState,
  }
}
