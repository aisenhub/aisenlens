import type { SceneDetectionConfig, SceneEngineClient, SceneEngineTask } from "@aisenlens/scene-engine";
import { adaptSceneResultToCandidates } from "./sceneResultAdapter.ts";
import type { AutoShotTaskRecord, AutoShotTaskRepository } from "./types";
import type { MediaSourceFingerprint } from "../project/types";

export interface AutoShotTaskServiceDependencies {
  createClient: () => SceneEngineClient;
  repository: AutoShotTaskRepository;
  resolveConfig: (config: SceneDetectionConfig) => SceneDetectionConfig;
  now?: () => string;
  createId?: () => string;
}

export interface StartAutoShotTaskInput {
  projectId: string;
  source: Blob;
  mediaFingerprint: MediaSourceFingerprint;
  config: SceneDetectionConfig;
  durationUs: number;
  fpsNumerator: number;
  fpsDenominator: number;
  resume?: boolean;
  restart?: boolean;
  onUpdate?: (record: AutoShotTaskRecord) => void;
}

export interface AutoShotTaskHandle {
  readonly taskId: string;
  readonly completion: Promise<AutoShotTaskRecord>;
  pause(): Promise<AutoShotTaskRecord>;
  cancel(): Promise<AutoShotTaskRecord>;
}

function fingerprintKey(fingerprint: MediaSourceFingerprint): string {
  return JSON.stringify([fingerprint.name, fingerprint.size, fingerprint.lastModified, fingerprint.mimeType]);
}

function terminal(status: AutoShotTaskRecord["status"]): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

function sameFingerprintKey(left: string, right: string): boolean {
  return left === right;
}

export function createAutoShotTaskService(dependencies: AutoShotTaskServiceDependencies) {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const createId = dependencies.createId ?? (() => crypto.randomUUID());
  let active: { taskId: string; engineTask: SceneEngineTask; record: AutoShotTaskRecord; onUpdate?: (record: AutoShotTaskRecord) => void; persistQueue: Promise<void> } | null = null;

  async function save(record: AutoShotTaskRecord): Promise<void> {
    const current = active;
    if (!current || current.taskId !== record.id) return;
    current.persistQueue = current.persistQueue.then(async () => {
      await dependencies.repository.saveAutoShotTask(record);
      if (active?.taskId === record.id) active.onUpdate?.(record);
    });
    await current.persistQueue;
  }

  function baseRecord(input: StartAutoShotTaskInput, config: SceneDetectionConfig, id: string, checkpoint: AutoShotTaskRecord["checkpoint"]): AutoShotTaskRecord {
    const timestamp = now();
    return {
      id,
      projectId: input.projectId,
      mediaFingerprint: input.mediaFingerprint,
      config,
      status: "running",
      engineVersion: checkpoint?.engineVersion ?? null,
      configHash: checkpoint?.configHash ?? null,
      progress: { processedUs: checkpoint?.resumeAfter.timestampUs ?? 0, durationUs: input.durationUs, decodedFrames: checkpoint?.resumeAfter.nextPresentationIndex ?? 0, candidateCount: checkpoint?.committedBoundaries.length ?? 0 },
      candidates: [],
      checkpoint,
      result: null,
      error: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  async function start(input: StartAutoShotTaskInput): Promise<AutoShotTaskHandle> {
    const config = dependencies.resolveConfig(input.config);
    const existing = await dependencies.repository.getAutoShotTask(input.projectId, input.mediaFingerprint);
    if (active) throw new Error("An auto-shot task is already running");
    if (existing?.status === "running") throw new Error("An auto-shot task is already running");
    if (existing?.status === "paused" && !input.resume && !input.restart) throw new Error("A paused auto-shot task requires resume or restart");
    if (input.restart && existing) await dependencies.repository.deleteAutoShotTask(input.projectId);
    const checkpoint = input.resume && existing?.status === "paused" ? existing.checkpoint : null;
    if (input.resume && !checkpoint) throw new Error("No paused checkpoint is available for resume");
    if (input.resume && existing?.status === "paused" && checkpoint) {
      const checkpointMatchesMedia = sameFingerprintKey(checkpoint.mediaFingerprint, fingerprintKey(input.mediaFingerprint));
      const checkpointMatchesConfig = JSON.stringify(existing.config) === JSON.stringify(config);
      if (!checkpointMatchesMedia || !checkpointMatchesConfig || checkpoint.schemaVersion !== 1 || !checkpoint.engineVersion || !checkpoint.configHash) {
        await dependencies.repository.deleteAutoShotTask(input.projectId);
        throw new Error("保存的自动分镜 checkpoint 与当前媒体、配置或引擎版本不匹配，已失效。请重新扫描。");
      }
    }
    const record = baseRecord(input, config, createId(), checkpoint);
    const client = dependencies.createClient();
    const engineTask = client.start({ source: input.source, mediaFingerprint: fingerprintKey(input.mediaFingerprint), config, checkpoint: checkpoint ?? undefined }, {
      onProgress: (progress) => {
        if (!active || active.taskId !== record.id || terminal(active.record.status)) return;
        active.record = { ...active.record, updatedAt: now(), progress: { processedUs: progress.processedUs, durationUs: progress.durationUs, decodedFrames: progress.decodedFrames, candidateCount: progress.totalBoundaries } };
        void save(active.record);
      },
    });
    active = { taskId: record.id, engineTask, record, onUpdate: input.onUpdate, persistQueue: Promise.resolve() };
    await save(record);
    const completion = engineTask.completion.then(async (outcome) => {
      if (!active || active.taskId !== record.id) return record;
      let next = active.record;
      if (outcome.status === "completed") {
        const adapted = adaptSceneResultToCandidates({ result: outcome.result, durationUs: input.durationUs, fpsNumerator: input.fpsNumerator, fpsDenominator: input.fpsDenominator });
        next = { ...next, status: "completed", engineVersion: outcome.result.engineVersion, configHash: outcome.result.configHash, progress: { processedUs: outcome.result.media.durationUs, durationUs: outcome.result.media.durationUs, decodedFrames: outcome.result.media.decodedFrames, candidateCount: adapted.candidates.length }, candidates: adapted.candidates, checkpoint: null, result: outcome.result, error: null, updatedAt: now() };
      } else if (outcome.status === "paused") {
        next = { ...next, status: "paused", engineVersion: outcome.checkpoint.engineVersion, configHash: outcome.checkpoint.configHash, checkpoint: outcome.checkpoint, updatedAt: now() };
      } else if (outcome.status === "cancelled") {
        next = { ...next, status: "cancelled", checkpoint: null, updatedAt: now() };
      } else {
        next = { ...next, status: "failed", checkpoint: null, error: outcome.error, updatedAt: now() };
      }
      active.record = next;
      await save(next);
      active = null;
      await client.dispose();
      return next;
    });
    return {
      taskId: record.id,
      completion,
      pause: async () => { await engineTask.pause(); return completion; },
      cancel: async () => { await engineTask.cancel(); return completion; },
    };
  }

  return { start };
}
