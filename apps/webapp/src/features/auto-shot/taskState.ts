import type { SceneEngineCheckpoint } from "@aisenlens/scene-engine";
import type { AutoShotTaskStatus } from "./types";
import type { RuntimeTaskLifecycleState } from "../../types/runtime";

const transitions: Record<AutoShotTaskStatus, readonly AutoShotTaskStatus[]> = {
  running: ["paused", "completed", "failed", "cancelled", "interrupted"],
  paused: ["running", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
  interrupted: [],
};

export function canTransitionAutoShotTask(from: AutoShotTaskStatus, to: AutoShotTaskStatus): boolean {
  return from === to || transitions[from].includes(to);
}

export function toRuntimeTaskLifecycleState(status: AutoShotTaskStatus): RuntimeTaskLifecycleState {
  if (status === "completed") return { status: "succeeded", suspension: null };
  if (status === "failed") return { status: "failed", suspension: null };
  if (status === "cancelled") return { status: "cancelled", suspension: null };
  if (status === "paused") return { status: "running", suspension: "paused" };
  if (status === "interrupted") return { status: "failed", suspension: "interrupted" };
  return { status: "running", suspension: null };
}

export function canPersistPausedAutoShotTask(checkpoint: SceneEngineCheckpoint | null): checkpoint is SceneEngineCheckpoint {
  return checkpoint !== null
    && checkpoint.schemaVersion === 1
    && typeof checkpoint.engineVersion === "string" && checkpoint.engineVersion.length > 0
    && typeof checkpoint.configHash === "string" && checkpoint.configHash.length > 0
    && typeof checkpoint.mediaIdentityDigest === "string" && checkpoint.mediaIdentityDigest.length > 0
    && checkpoint.coreState instanceof ArrayBuffer
    && checkpoint.resumeAfter.timestampUs >= 0
    && checkpoint.resumeAfter.timestampOrdinal >= 0
    && checkpoint.resumeAfter.nextPresentationIndex >= 0;
}

export function recoverAutoShotTaskStatus(status: AutoShotTaskStatus, checkpoint: SceneEngineCheckpoint | null): AutoShotTaskStatus {
  if (status === "running") return "interrupted";
  if (status === "paused" && !canPersistPausedAutoShotTask(checkpoint)) return "interrupted";
  return status;
}
