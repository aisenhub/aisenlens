import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSceneEngineClient } from "@aisenlens/scene-engine";
import { resolveSceneDetectionConfig } from "@aisenlens/scene-engine";
import projectRepository from "../../project/services/projectRepository";
import type { MediaSourceFingerprint } from "../../project/types";
import { createAutoShotTaskService, type AutoShotTaskHandle, type StartAutoShotTaskInput } from "../autoShotTaskService";
import type { AutoShotTaskRecord } from "../types";

interface UseAutoShotTaskInput {
  projectId: string;
  sourceUrl: string;
  mediaFingerprint: MediaSourceFingerprint | null;
  durationSeconds: number;
  frameRate: number;
  config: StartAutoShotTaskInput["config"];
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
  const handleRef = useRef<AutoShotTaskHandle | null>(null);
  const revisionRef = useRef(0);
  const service = useMemo(() => createAutoShotTaskService({
    createClient: () => createSceneEngineClient({
      createWorker: () => new Worker(new URL("../workers/scene-engine.worker.ts", import.meta.url), { type: "module" }),
    }),
    repository: projectRepository,
    resolveConfig: resolveSceneDetectionConfig,
  }), []);

  useEffect(() => {
    const revision = ++revisionRef.current;
    setError(null);
    setRecord(null);
    setIsActive(false);
    if (!input.mediaFingerprint) return;
    let active = true;
    void projectRepository.getAutoShotTask(input.projectId, input.mediaFingerprint).then(async (existing) => {
      if (!active || revision !== revisionRef.current) return;
      if (existing?.status === "running") {
        const paused = { ...existing, status: "paused" as const, updatedAt: new Date().toISOString() };
        await projectRepository.saveAutoShotTask(paused);
        if (!active || revision !== revisionRef.current) return;
        setRecord(paused);
        return;
      }
      setRecord(existing);
    }).catch((cause) => {
      if (active && revision === revisionRef.current) setError(cause instanceof Error ? cause.message : "无法读取自动分镜任务。");
    });
    return () => {
      active = false;
      const handle = handleRef.current;
      handleRef.current = null;
      setIsActive(false);
      if (handle) void handle.cancel().catch(() => undefined);
    };
  }, [input.mediaFingerprint, input.projectId]);

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
    const revision = revisionRef.current;
    setError(null);
    try {
      const source = await fetch(input.sourceUrl).then((response) => {
        if (!response.ok) throw new Error(`无法读取视频素材：${response.status}`);
        return response.blob();
      });
      const fps = fpsRational(input.frameRate);
      const taskInput: StartAutoShotTaskInput = {
        projectId: input.projectId,
        source,
        mediaFingerprint: input.mediaFingerprint,
        config: input.config,
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
      const message = cause instanceof Error ? cause.message : "自动分镜失败。";
      if (revision === revisionRef.current) setError(message);
      return null;
    }
  }, [input.config, input.durationSeconds, input.frameRate, input.mediaFingerprint, input.projectId, input.sourceUrl, service]);

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
