import type {
  SceneEngineError,
  SceneEngineClient,
  SceneEngineTask,
} from "@aisenlens/scene-engine"
import { canonicalizeSceneDetectionConfig } from "../../../../../packages/scene-engine/src/api/configHash.ts"
import { adaptSceneResultToCandidates } from "./sceneResultAdapter.ts"
import type { AutoShotTaskRecord, AutoShotTaskRepository } from "./types"
import type { AutoShotMediaIdentity } from "./mediaIdentity.ts"
import type { ResolvedAutoShotConfiguration } from "./config/types.ts"
import { sameAutoShotMediaIdentity } from "./mediaIdentity.ts"
import { canPersistPausedAutoShotTask } from "./taskState.ts"

export interface AutoShotTaskServiceDependencies {
  createClient: () => SceneEngineClient
  repository: AutoShotTaskRepository
  now?: () => string
  createId?: () => string
}

export interface StartAutoShotTaskInput {
  projectId: string
  source: Blob
  mediaIdentity: AutoShotMediaIdentity
  resolved: ResolvedAutoShotConfiguration
  durationUs: number
  fpsNumerator: number
  fpsDenominator: number
  resume?: boolean
  restart?: boolean
  onUpdate?: (record: AutoShotTaskRecord) => void
}

export interface AutoShotTaskHandle {
  readonly taskId: string
  readonly completion: Promise<AutoShotTaskRecord>
  pause(): Promise<AutoShotTaskRecord>
  cancel(): Promise<AutoShotTaskRecord>
}

function terminal(status: AutoShotTaskRecord["status"]): boolean {
  return (
    status === "completed" ||
    status === "failed" ||
    status === "cancelled" ||
    status === "interrupted"
  )
}

export function createAutoShotTaskService(
  dependencies: AutoShotTaskServiceDependencies,
) {
  const now = dependencies.now ?? (() => new Date().toISOString())
  const createId = dependencies.createId ?? (() => crypto.randomUUID())
  let active: {
    taskId: string
    engineTask: SceneEngineTask
    record: AutoShotTaskRecord
    onUpdate?: (record: AutoShotTaskRecord) => void
    persistQueue: Promise<void>
    persistenceError: SceneEngineError | null
  } | null = null

  function persistenceError(cause: unknown): SceneEngineError {
    return {
      code: "INTERNAL_ERROR",
      message:
        cause instanceof Error
          ? `自动分镜任务保存失败：${cause.message}`
          : "自动分镜任务保存失败。",
    }
  }

  async function save(record: AutoShotTaskRecord): Promise<void> {
    const current = active
    if (!current || current.taskId !== record.id) return
    // A failed progress write must not poison the queue forever; the terminal
    // record still needs a chance to persist the failure and release resources.
    current.persistQueue = current.persistQueue
      .catch(() => undefined)
      .then(async () => {
        await dependencies.repository.saveAutoShotTask(record)
        if (active?.taskId === record.id) active.onUpdate?.(record)
      })
    await current.persistQueue
  }

  function baseRecord(
    input: StartAutoShotTaskInput,
    id: string,
    checkpoint: AutoShotTaskRecord["checkpoint"],
  ): AutoShotTaskRecord {
    const timestamp = now()
    return {
      id,
      projectId: input.projectId,
      mediaIdentity: input.mediaIdentity,
      review: { excludedCandidateIds: [], updatedAt: null, appliedAt: null },
      controlSnapshot: input.resolved.settings,
      config: input.resolved.engineConfig,
      status: "running",
      engineVersion: checkpoint?.engineVersion ?? null,
      configHash: checkpoint?.configHash ?? input.resolved.configHash,
      progress: {
        processedUs: checkpoint?.resumeAfter.timestampUs ?? 0,
        durationUs: input.durationUs,
        decodedFrames: checkpoint?.resumeAfter.nextPresentationIndex ?? 0,
        candidateCount: checkpoint?.committedBoundaries.length ?? 0,
      },
      candidates: [],
      checkpoint,
      result: null,
      error: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  }

  async function start(
    input: StartAutoShotTaskInput,
  ): Promise<AutoShotTaskHandle> {
    const config = input.resolved.engineConfig
    const configSnapshot = { text: input.resolved.configHash, canonical: input.resolved.canonicalConfig }
    const existing = await dependencies.repository.getAutoShotTask(
      input.projectId,
      input.mediaIdentity,
    )
    if (active) throw new Error("An auto-shot task is already running")
    if (existing?.status === "running")
      throw new Error("An auto-shot task is already running")
    if (existing?.status === "paused" && !input.resume && !input.restart)
      throw new Error("A paused auto-shot task requires resume or restart")
    if (input.restart && existing)
      await dependencies.repository.deleteAutoShotTask(input.projectId)
    const checkpoint =
      input.resume && existing?.status === "paused" ? existing.checkpoint : null
    if (input.resume && !checkpoint)
      throw new Error("No paused checkpoint is available for resume")
    if (input.resume && existing?.status === "paused" && checkpoint) {
      const checkpointMatchesMedia =
        sameAutoShotMediaIdentity(
          existing.mediaIdentity,
          input.mediaIdentity,
        ) &&
        checkpoint.mediaIdentityDigest ===
          input.mediaIdentity.mediaIdentityDigest
      const checkpointMatchesConfig =
        checkpoint.configHash === configSnapshot.text &&
        existing.configHash === configSnapshot.text &&
        canonicalizeSceneDetectionConfig(existing.config) ===
          configSnapshot.canonical
      if (
        !checkpointMatchesMedia ||
        !checkpointMatchesConfig ||
        checkpoint.schemaVersion !== 1 ||
        !checkpoint.engineVersion ||
        !checkpoint.configHash
      ) {
        await dependencies.repository.saveAutoShotTask({
          ...existing,
          status: "interrupted",
          updatedAt: now(),
        })
        throw new Error(
          "保存的自动分镜 checkpoint 与当前媒体、配置或引擎版本不匹配，已失效。请重新扫描。",
        )
      }
    }
    const record = baseRecord(
      input,
      createId(),
      checkpoint,
    )
    const client = dependencies.createClient()
    let engineTask: SceneEngineTask
    try {
      engineTask = client.start(
        {
          source: input.source,
          mediaIdentityDigest: input.mediaIdentity.mediaIdentityDigest,
          config,
          checkpoint: checkpoint ?? undefined,
        },
        {
          onProgress: (progress) => {
            if (
              !active ||
              active.taskId !== record.id ||
              terminal(active.record.status)
            )
              return
            active.record = {
              ...active.record,
              updatedAt: now(),
              progress: {
                processedUs: progress.processedUs,
                durationUs: progress.durationUs,
                decodedFrames: progress.decodedFrames,
                candidateCount: progress.totalBoundaries,
              },
            }
            void save(active.record).catch((cause) => {
              if (active?.taskId === record.id)
                active.persistenceError = persistenceError(cause)
            })
          },
        },
      )
    } catch (cause) {
      await client.dispose().catch(() => undefined)
      throw cause
    }
    active = {
      taskId: record.id,
      engineTask,
      record,
      onUpdate: input.onUpdate,
      persistQueue: Promise.resolve(),
      persistenceError: null,
    }
    try {
      await save(record)
    } catch (cause) {
      active = null
      await engineTask.cancel().catch(() => undefined)
      await client.dispose().catch(() => undefined)
      throw cause
    }
    const completion = engineTask.completion.then(async (outcome) => {
      if (!active || active.taskId !== record.id) return record
      try {
        let next = active.record
        if (outcome.status === "completed") {
          const adapted = adaptSceneResultToCandidates({
            result: outcome.result,
            durationUs: input.durationUs,
            fpsNumerator: input.fpsNumerator,
            fpsDenominator: input.fpsDenominator,
          })
          next = {
            ...next,
            status: "completed",
            engineVersion: outcome.result.engineVersion,
            configHash: outcome.result.configHash,
            progress: {
              processedUs: outcome.result.media.durationUs,
              durationUs: outcome.result.media.durationUs,
              decodedFrames: outcome.result.media.decodedFrames,
              candidateCount: adapted.candidates.length,
            },
            candidates: adapted.candidates,
            checkpoint: null,
            result: outcome.result,
            error: null,
            updatedAt: now(),
          }
        } else if (outcome.status === "paused") {
          if (!canPersistPausedAutoShotTask(outcome.checkpoint)) {
            next = {
              ...next,
              status: "interrupted",
              checkpoint: null,
              error: {
                code: "INVALID_CHECKPOINT",
                message: "暂停结果缺少完整 checkpoint，任务已标记为中断。",
              },
              updatedAt: now(),
            }
          } else {
            next = {
              ...next,
              status: "paused",
              engineVersion: outcome.checkpoint.engineVersion,
              configHash: outcome.checkpoint.configHash,
              checkpoint: outcome.checkpoint,
              updatedAt: now(),
            }
          }
        } else if (outcome.status === "cancelled") {
          next = {
            ...next,
            status: "cancelled",
            checkpoint: null,
            updatedAt: now(),
          }
        } else {
          next = {
            ...next,
            status: "failed",
            checkpoint: null,
            error: outcome.error,
            updatedAt: now(),
          }
        }
        if (active.persistenceError) {
          next = {
            ...next,
            status: "failed",
            checkpoint: null,
            result: null,
            error: active.persistenceError,
            updatedAt: now(),
          }
        }
        active.record = next
        await save(next)
        return next
      } finally {
        if (active?.taskId === record.id) active = null
        await client.dispose().catch(() => undefined)
      }
    })
    return {
      taskId: record.id,
      completion,
      pause: async () => {
        await engineTask.pause()
        return completion
      },
      cancel: async () => {
        await engineTask.cancel()
        return completion
      },
    }
  }

  return { start }
}
