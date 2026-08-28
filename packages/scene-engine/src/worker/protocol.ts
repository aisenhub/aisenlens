import type {
  SceneDetectionConfig,
  SceneEngineCheckpoint,
  SceneEngineError,
  SceneEngineProgress,
  SceneEngineResult,
  StartSceneDetectionRequest,
} from "../api/types.js";

export interface InitMessage {
  type: "INIT";
}

export interface StartMessage {
  type: "START";
  jobId: string;
  source: Blob;
  mediaFingerprint: string;
  config: SceneDetectionConfig;
  checkpoint?: SceneEngineCheckpoint;
}

export interface PauseMessage {
  type: "PAUSE";
  jobId: string;
}

export interface CancelMessage {
  type: "CANCEL";
  jobId: string;
}

export interface DisposeMessage {
  type: "DISPOSE";
}

export type MainToWorkerMessage = InitMessage | StartMessage | PauseMessage | CancelMessage | DisposeMessage;

export interface ReadyMessage {
  type: "READY";
  backend: "wasm-baseline" | "wasm-simd";
  version: string;
}

export interface StartedMessage {
  type: "STARTED";
  jobId: string;
}

export interface ProgressMessage {
  type: "PROGRESS";
  jobId: string;
  progress: SceneEngineProgress;
}

export interface CheckpointMessage {
  type: "CHECKPOINT";
  jobId: string;
  checkpoint: SceneEngineCheckpoint;
}

export interface CompletedMessage {
  type: "COMPLETED";
  jobId: string;
  result: SceneEngineResult;
}

export interface CancelledMessage {
  type: "CANCELLED";
  jobId: string;
}

export interface ErrorMessage {
  type: "ERROR";
  jobId: string | null;
  error: SceneEngineError;
}

export type WorkerToMainMessage = ReadyMessage | StartedMessage | ProgressMessage | CheckpointMessage | CompletedMessage | CancelledMessage | ErrorMessage;

export type WorkerPhase = "idle" | "initializing" | "ready" | "running" | "pausing" | "cancelling" | "disposed";

export interface WorkerProtocolState {
  phase: WorkerPhase;
  currentJobId: string | null;
  lastTerminalJobId: string | null;
}

export const INITIAL_WORKER_PROTOCOL_STATE: WorkerProtocolState = {
  phase: "idle",
  currentJobId: null,
  lastTerminalJobId: null,
};

export type ProtocolTransition = { state: WorkerProtocolState; ignored: boolean };

function isJobMessage(message: WorkerToMainMessage): message is Exclude<WorkerToMainMessage, ReadyMessage | ErrorMessage> {
  return message.type !== "READY" && message.type !== "ERROR";
}

function assertJobId(jobId: string, expected: string | null, type: string): boolean {
  return typeof jobId === "string" && jobId.length > 0 && jobId === expected;
}

export function transitionWorkerProtocol(state: WorkerProtocolState, message: MainToWorkerMessage | WorkerToMainMessage): ProtocolTransition {
  if (state.phase === "disposed") {
    return { state, ignored: true };
  }
  if (message.type === "DISPOSE") {
    return { state: { phase: "disposed", currentJobId: null, lastTerminalJobId: state.currentJobId ?? state.lastTerminalJobId }, ignored: false };
  }
  if (message.type === "INIT") {
    if (state.phase !== "idle") throw new Error(`INIT is invalid in ${state.phase}`);
    return { state: { ...state, phase: "initializing" }, ignored: false };
  }
  if (message.type === "READY") {
    if (state.phase !== "initializing") throw new Error(`READY is invalid in ${state.phase}`);
    return { state: { ...state, phase: "ready" }, ignored: false };
  }
  if (message.type === "START") {
    if (state.phase !== "ready" || !message.jobId) throw new Error(`START is invalid in ${state.phase}`);
    if (message.jobId === state.lastTerminalJobId) throw new Error("START must use a new jobId");
    return { state: { phase: "running", currentJobId: message.jobId, lastTerminalJobId: state.lastTerminalJobId }, ignored: false };
  }
  if (message.type === "PAUSE") {
    if (state.phase !== "running" || !assertJobId(message.jobId, state.currentJobId, message.type)) throw new Error("PAUSE is invalid for the current worker job");
    return { state: { ...state, phase: "pausing" }, ignored: false };
  }
  if (message.type === "CANCEL") {
    if (!["running", "pausing"].includes(state.phase) || !assertJobId(message.jobId, state.currentJobId, message.type)) throw new Error("CANCEL is invalid for the current worker job");
    return { state: { ...state, phase: "cancelling" }, ignored: false };
  }
  if (message.type === "STARTED") {
    if (state.phase !== "running" || !assertJobId(message.jobId, state.currentJobId, message.type)) throw new Error("STARTED is invalid for the current worker job");
    return { state, ignored: false };
  }
  if (isJobMessage(message) && !assertJobId(message.jobId, state.currentJobId, message.type)) {
    return { state, ignored: true };
  }
  if (message.type === "PROGRESS") {
    if (state.phase !== "running") throw new Error(`PROGRESS is invalid in ${state.phase}`);
    return { state, ignored: false };
  }
  if (message.type === "CHECKPOINT") {
    if (state.phase !== "pausing") throw new Error(`CHECKPOINT is invalid in ${state.phase}`);
    return { state: { phase: "ready", currentJobId: null, lastTerminalJobId: message.jobId }, ignored: false };
  }
  if (message.type === "COMPLETED") {
    if (state.phase !== "running") throw new Error(`${message.type} is invalid in ${state.phase}`);
    return { state: { phase: "ready", currentJobId: null, lastTerminalJobId: message.jobId }, ignored: false };
  }
  if (message.type === "CANCELLED") {
    if (state.phase !== "cancelling") throw new Error(`${message.type} is invalid in ${state.phase}`);
    return { state: { phase: "ready", currentJobId: null, lastTerminalJobId: message.jobId }, ignored: false };
  }
  if (message.type === "ERROR") {
    if (message.jobId !== null && state.currentJobId !== message.jobId) return { state, ignored: true };
    return { state: { phase: "ready", currentJobId: null, lastTerminalJobId: state.currentJobId }, ignored: false };
  }
  const exhaustive: never = message;
  return exhaustive;
}

export function startMessageFromRequest(jobId: string, request: StartSceneDetectionRequest): StartMessage {
  return { type: "START", jobId, source: request.source, mediaFingerprint: request.mediaFingerprint, config: request.config, checkpoint: request.checkpoint };
}
