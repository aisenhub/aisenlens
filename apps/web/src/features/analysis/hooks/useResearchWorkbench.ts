import { useCallback, useEffect, useRef, useState } from "react"
import projectRepository from "../../project/services/projectRepository.ts"
import type { EvidenceRef, ResearchContext, ResearchRange, ResearchTarget } from "../types.ts"
import { createResearchContext, createResearchRange } from "../services/researchService.ts"
import { researchTargetKey } from "../types.ts"

interface UseResearchWorkbenchInput {
  projectId: string
}

export type ResearchWriteState = "idle" | "loading" | "saving" | "error"

export default function useResearchWorkbench({ projectId }: UseResearchWorkbenchInput) {
  const [ranges, setRanges] = useState<ResearchRange[]>([])
  const [contexts, setContexts] = useState<ResearchContext[]>([])
  const [writeState, setWriteState] = useState<ResearchWriteState>("loading")
  const [error, setError] = useState<string | null>(null)
  const queueRef = useRef(new Map<string, Promise<void>>())
  const rangesRef = useRef<ResearchRange[]>([])
  const contextsRef = useRef<ResearchContext[]>([])
  const requestRef = useRef(0)

  useEffect(() => { rangesRef.current = ranges }, [ranges])
  useEffect(() => { contextsRef.current = contexts }, [contexts])

  const reload = useCallback(async () => {
    const requestId = ++requestRef.current
    setWriteState("loading")
    setError(null)
    try {
      const [nextRanges, nextContexts] = await Promise.all([
        projectRepository.listProjectResearchRanges(projectId),
        projectRepository.listProjectResearchContexts(projectId),
      ])
      if (requestId !== requestRef.current) return
      rangesRef.current = nextRanges
      contextsRef.current = nextContexts
      setRanges(nextRanges)
      setContexts(nextContexts)
      setWriteState("idle")
    } catch (cause) {
      if (requestId !== requestRef.current) return
      setWriteState("error")
      setError(cause instanceof Error ? cause.message : "研究数据读取失败，请重试。")
    }
  }, [projectId])

  useEffect(() => { void reload() }, [reload])

  const enqueue = useCallback((key: string, task: () => Promise<void>) => {
    const previous = queueRef.current.get(key) ?? Promise.resolve()
    const next = previous.catch(() => undefined).then(task).finally(() => {
      if (queueRef.current.get(key) === next) queueRef.current.delete(key)
    })
    queueRef.current.set(key, next)
    return next
  }, [])

  const saveRange = useCallback((range: ResearchRange) => {
    rangesRef.current = rangesRef.current.some((item) => item.id === range.id)
      ? rangesRef.current.map((item) => item.id === range.id ? range : item)
      : [...rangesRef.current, range]
    setRanges(rangesRef.current)
    setWriteState("saving")
    setError(null)
    return enqueue(`range:${range.id}`, async () => {
      try {
        await projectRepository.saveProjectResearchRange(range, range.revision > 1 ? range.revision - 1 : undefined)
        setWriteState(queueRef.current.size > 1 ? "saving" : "idle")
      } catch (cause) {
        setWriteState("error")
        setError(cause instanceof Error ? cause.message : "研究范围保存失败。")
        throw cause
      }
    })
  }, [enqueue])

  const saveContext = useCallback((context: ResearchContext) => {
    const key = researchTargetKey(projectId, context.target)
    contextsRef.current = contextsRef.current.some((item) => item.id === context.id || researchTargetKey(projectId, item.target) === key)
      ? contextsRef.current.map((item) => item.id === context.id || researchTargetKey(projectId, item.target) === key ? context : item)
      : [...contextsRef.current, context]
    setContexts(contextsRef.current)
    setWriteState("saving")
    setError(null)
    return enqueue(`context:${key}`, async () => {
      try {
        await projectRepository.saveProjectResearchContext(context, context.revision > 1 ? context.revision - 1 : undefined)
        setWriteState(queueRef.current.size > 1 ? "saving" : "idle")
      } catch (cause) {
        setWriteState("error")
        setError(cause instanceof Error ? cause.message : "研究上下文保存失败。")
        throw cause
      }
    })
  }, [enqueue, projectId])

  const updateContext = useCallback((target: ResearchTarget, patch: Partial<Pick<ResearchContext, "question" | "status" | "needsReview" | "needsReviewReasons" | "evidence">>) => {
    const key = researchTargetKey(projectId, target)
    const current = contextsRef.current.find((item) => researchTargetKey(projectId, item.target) === key)
    const now = new Date().toISOString()
    const next = current
      ? { ...current, ...patch, updatedAt: now, revision: current.revision + 1 }
      : createResearchContext({ projectId, target, question: patch.question ?? "", status: patch.status ?? "not-started", needsReview: patch.needsReview ?? false, needsReviewReasons: patch.needsReviewReasons ?? [], structureRevision: 1, evidence: patch.evidence ?? [] })
    return saveContext(next)
  }, [projectId, saveContext])

  const updateRange = useCallback((range: ResearchRange, patch: Partial<Pick<ResearchRange, "startUs" | "endUs" | "title" | "observation" | "interpretation" | "summary">>) => {
    return saveRange({ ...range, ...patch, updatedAt: new Date().toISOString(), revision: range.revision + 1 })
  }, [saveRange])

  const createRangeForMedia = useCallback((input: Pick<ResearchRange, "startUs" | "endUs" | "mediaIdentityDigest"> & Partial<Pick<ResearchRange, "title" | "observation" | "interpretation" | "summary">>) => {
    const range = createResearchRange({ projectId, mediaIdentityDigest: input.mediaIdentityDigest, startUs: input.startUs, endUs: input.endUs, title: input.title ?? "未命名研究范围", observation: input.observation ?? "", interpretation: input.interpretation ?? "", summary: input.summary ?? "" })
    return saveRange(range).then(() => range)
  }, [projectId, saveRange])

  const addEvidence = useCallback((target: ResearchTarget, evidence: EvidenceRef) => {
    const key = researchTargetKey(projectId, target)
    const current = contextsRef.current.find((item) => researchTargetKey(projectId, item.target) === key)
    const evidenceList = [...(current?.evidence ?? []).filter((item) => item.id !== evidence.id), evidence]
    return updateContext(target, { evidence: evidenceList })
  }, [projectId, updateContext])

  const removeEvidence = useCallback((target: ResearchTarget, evidenceId: string) => {
    const key = researchTargetKey(projectId, target)
    const current = contextsRef.current.find((item) => researchTargetKey(projectId, item.target) === key)
    return updateContext(target, { evidence: (current?.evidence ?? []).filter((item) => item.id !== evidenceId) })
  }, [projectId, updateContext])

  const flush = useCallback(async () => { await Promise.all([...queueRef.current.values()]) }, [])

  return { ranges, contexts, writeState, error, reload, saveRange, saveContext, updateRange, updateContext, createRangeForMedia, addEvidence, removeEvidence, flush }
}
