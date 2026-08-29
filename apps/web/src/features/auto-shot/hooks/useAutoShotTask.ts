import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSceneEngineClient } from "@aisenlens/scene-engine";
import projectRepository from "../../project/services/projectRepository";
import type { MediaSourceFingerprint } from "../../project/types";
import { createAutoShotTaskService, type AutoShotTaskHandle, type StartAutoShotTaskInput } from "../autoShotTaskService";
import type { AutoShotTaskRecord } from "../types";
import { recoverAutoShotTaskStatus } from "../taskState";
import { createAutoShotMediaIdentity } from "../mediaIdentityService";
import type { AutoShotMediaIdentity } from "../mediaIdentity";
import type { ResolvedAutoShotConfiguration } from "../config/types";

interface UseAutoShotTaskInput {
  projectId: string;
  sourceUrl: string;
  mediaFingerprint: MediaSourceFingerprint | null;
  durationSeconds: number;
  frameRate: number;
  resolved: ResolvedAutoShotConfiguration;
}

function fpsRational(frameRate: number): { numerator: number; denominator: number } {
  const safeRate = Number.isFinite(frameRate) && frameRate > 0 ? frameRate : 30;
  const denominator = 1000;
  return { numerator: Math.max(1, Math.round(safeRate * denominator)), denominator };
}

export default function useAutoShotTask(input: UseAutoShotTaskInput) {
  const [record, setRecord] = useState<AutoShotTaskRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [mediaIdentity, setMediaIdentity] = useState<AutoShotMediaIdentity | null>(null);
  const handleRef = useRef<AutoShotTaskHandle | null>(null);
  const startingRef = useRef(false);
  const cancellationRef = useRef<Promise<unknown> | null>(null);
  const revisionRef = useRef(0);
  const service = useMemo(() => createAutoShotTaskService({
    createClient: () => createSceneEngineClient({
      createWorker: () => new Worker(new URL("../workers/scene-engine.worker.ts", import.meta.url), { type: "module" }),
    }),
    repository: projectRepository,
  }), []);

  useEffect(() => {
    const revision = ++revisionRef.current;
    startingRef.current = false;
    setError(null);
    setRecord(null);
    setIsActive(false);
    setMediaIdentity(null);
    if (!input.mediaFingerprint || !input.sourceUrl) return;
    let active = true;
    void fetch(input.sourceUrl).then(async (response) => {
      if (!response.ok) throw new Error(`无法读取视频素材：${response.status}`);
      const blob = await response.blob();
      const identity = await createAutoShotMediaIdentity(new File([blob], input.mediaFingerprint?.name ?? "video", { type: input.mediaFingerprint?.mimeType ?? blob.type }));
      if (!active || revision !== revisionRef.current) return null;
      setMediaIdentity(identity);
      return projectRepository.getAutoShotTask(input.projectId, identity);
    }).then(async (existing) => {
      if (!existing) return;
      if (!active || revision !== revisionRef.current) return;
      // A user may start while the identity digest is still being computed.
      // Never let the late repository read overwrite that live task state.
      if (handleRef.current || startingRef.current) return;
      if (existing?.status === "running" || existing?.status === "paused") {
        const recoveredStatus = recoverAutoShotTaskStatus(existing.status, existing.checkpoint);
        if (recoveredStatus === existing.status) {
          setRecord(existing);
          return;
        }
        const interrupted = { ...existing, status: recoveredStatus, updatedAt: new Date().toISOString() };
        await projectRepository.saveAutoShotTask(interrupted);
        if (!active || revision !== revisionRef.current) return;
        setRecord(interrupted);
        return;
      }
      setRecord(existing);
    }).catch((cause) => {
      if (active && revision === revisionRef.current) setError(cause instanceof Error ? cause.message : "无法读取自动分镜任务。");
    });
    return () => {
      active = false;
      startingRef.current = false;
      const handle = handleRef.current;
      handleRef.current = null;
      setIsActive(false);
      if (handle) {
        const cancellation = handle.cancel().catch(() => undefined);
        cancellationRef.current = cancellation;
        void cancellation.finally(() => {
          if (cancellationRef.current === cancellation) cancellationRef.current = null;
        });
      }
    };
  }, [input.mediaFingerprint, input.projectId, input.sourceUrl]);

  const start = useCallback(async ({ resume = false, restart = false }: { resume?: boolean; restart?: boolean } = {}) => {
    if (!input.mediaFingerprint) {
      setError("当前项目尚未关联可用视频。请先选择本地视频。");
      return null;
    }
    if (!input.sourceUrl) {
      setError("当前视频地址不可用，请重新关联本地视频。");
      return null;
    }
    if (input.durationSeconds <= 0) {
      setError("尚未读取视频时长，请等待视频加载完成后重试。");
      return null;
    }
    if (startingRef.current || handleRef.current) return null;
    startingRef.current = true;
    const revision = revisionRef.current;
    setError(null);
    try {
      await cancellationRef.current;
      if (revision !== revisionRef.current) return null;
      const source = await fetch(input.sourceUrl).then((response) => {
        if (!response.ok) throw new Error(`无法读取视频素材：${response.status}`);
        return response.blob();
      });
      const fps = fpsRational(input.frameRate);
      const taskInput: StartAutoShotTaskInput = {
        projectId: input.projectId,
        source,
        mediaIdentity: mediaIdentity ?? await createAutoShotMediaIdentity(new File([source], input.mediaFingerprint.name, { type: input.mediaFingerprint.mimeType })),
        resolved: input.resolved,
        durationUs: Math.max(1, Math.round(input.durationSeconds * 1_000_000)),
        fpsNumerator: fps.numerator,
        fpsDenominator: fps.denominator,
        resume,
        restart,
        onUpdate: (next) => {
          if (revision === revisionRef.current) setRecord(next);
        },
      };
      const handle = await service.start(taskInput);
      handleRef.current = handle;
      if (revision === revisionRef.current) setIsActive(true);
      startingRef.current = false;
      void handle.completion.then((completed) => {
        if (revision === revisionRef.current) setRecord(completed);
        if (handleRef.current?.taskId === handle.taskId) {
          handleRef.current = null;
          if (revision === revisionRef.current) setIsActive(false);
        }
      }).catch((cause) => {
        if (handleRef.current?.taskId === handle.taskId) {
          handleRef.current = null;
          if (revision === revisionRef.current) setIsActive(false);
        }
        if (revision === revisionRef.current) setError(cause instanceof Error ? cause.message : "自动分镜失败。");
      });
      return handle;
    } catch (cause) {
      startingRef.current = false;
      const message = cause instanceof Error ? cause.message : "自动分镜失败。";
      if (revision === revisionRef.current) setError(message);
      return null;
    }
  }, [input.durationSeconds, input.frameRate, input.mediaFingerprint, input.projectId, input.resolved, input.sourceUrl, mediaIdentity, service]);

  const pause = useCallback(async () => {
    const handle = handleRef.current;
    if (!handle) return record;
    const next = await handle.pause();
    setRecord(next);
    handleRef.current = null;
    setIsActive(false);
    return next;
  }, [record]);

  const cancel = useCallback(async () => {
    const handle = handleRef.current;
    if (!handle) return record;
    const next = await handle.cancel();
    setRecord(next);
    handleRef.current = null;
    setIsActive(false);
    return next;
  }, [record]);

  return { record, error, start, pause, cancel, isActive };
}
