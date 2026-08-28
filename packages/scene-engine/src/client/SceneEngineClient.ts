import { sceneEngineError, toSceneEngineError } from "../api/errors.js";
import type { SceneEngineClient as SceneEngineClientContract, SceneEngineError, SceneEngineProgress, SceneEngineTask, SceneTaskOutcome, StartSceneDetectionRequest } from "../api/types.js";
import { INITIAL_WORKER_PROTOCOL_STATE, startMessageFromRequest, transitionWorkerProtocol, type MainToWorkerMessage, type WorkerToMainMessage } from "../worker/protocol.js";

export interface WorkerLike {
  postMessage(message: MainToWorkerMessage): void;
  addEventListener(type: "message", listener: (event: MessageEvent<WorkerToMainMessage>) => void): void;
  addEventListener(type: "error", listener: (event: ErrorEvent) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent<WorkerToMainMessage>) => void): void;
  removeEventListener(type: "error", listener: (event: ErrorEvent) => void): void;
  terminate?(): void;
}

export interface SceneEngineClientOptions {
  createWorker: () => WorkerLike;
  backend?: "wasm-baseline" | "wasm-simd";
  engineVersion?: string;
}

function failedOutcome(error: SceneEngineError): SceneTaskOutcome {
  return { status: "failed", error };
}

function messageError(message: string): SceneEngineError {
  return { code: "INTERNAL_ERROR", message };
}

export class DefaultSceneEngineClient implements SceneEngineClientContract {
  private readonly worker: WorkerLike;
  private readonly options: SceneEngineClientOptions;
  private protocolState = INITIAL_WORKER_PROTOCOL_STATE;
  private disposed = false;
  private readyResolve!: () => void;
  private readyReject!: (error: unknown) => void;
  private readonly ready: Promise<void>;
  private activeTask: TaskController | null = null;

  constructor(options: SceneEngineClientOptions) {
    this.options = options;
    this.worker = options.createWorker();
    this.ready = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    this.worker.addEventListener("message", this.onMessage);
    this.worker.addEventListener("error", this.onWorkerError);
    this.protocolState = transitionWorkerProtocol(this.protocolState, { type: "INIT" }).state;
    this.send({ type: "INIT" });
  }

  start(request: StartSceneDetectionRequest, observer?: { onProgress(progress: SceneEngineProgress): void; signal?: AbortSignal }): SceneEngineTask {
    if (this.disposed) throw sceneEngineError("INTERNAL_ERROR", "Scene engine client has been disposed");
    if (this.activeTask) throw sceneEngineError("INTERNAL_ERROR", "Only one scene-engine task may run at a time");
    const jobId = `scene-job-${++jobSequence}`;
    const signal = observer?.signal;
    let task!: TaskController;
    task = new TaskController(jobId, observer, () => {
      if (this.activeTask?.jobId === jobId) this.activeTask = null;
      signal?.removeEventListener("abort", onAbort);
    });
    const onAbort = () => void task.cancelFromAbort();
    if (signal?.aborted) task.cancelFromAbort();
    else signal?.addEventListener("abort", onAbort, { once: true });
    this.activeTask = task;
    void this.ready.then(
      () => {
        if (this.disposed || task.isTerminal) return;
        this.protocolState = transitionWorkerProtocol(this.protocolState, startMessageFromRequest(jobId, request)).state;
        task.markStartedPending();
        this.send(startMessageFromRequest(jobId, request));
        task.attachCommand((message) => {
          this.protocolState = transitionWorkerProtocol(this.protocolState, message).state;
          this.send(message);
        });
      },
      (error) => task.fail(toSceneEngineError(error)),
    );
    return task.publicTask;
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    if (this.activeTask) this.activeTask.fail(messageError("Scene engine client disposed before task completion"));
    this.worker.removeEventListener("message", this.onMessage);
    this.worker.removeEventListener("error", this.onWorkerError);
    try {
      this.worker.postMessage({ type: "DISPOSE" });
    } finally {
      this.worker.terminate?.();
    }
  }

  private readonly send = (message: MainToWorkerMessage) => {
    if (!this.disposed) this.worker.postMessage(message);
  };

  private readonly onMessage = (event: MessageEvent<WorkerToMainMessage>) => {
    const message = event.data;
    try {
      const transition = transitionWorkerProtocol(this.protocolState, message);
      this.protocolState = transition.state;
      if (transition.ignored) return;
      if (message.type === "READY") {
        this.readyResolve();
        return;
      }
      if (message.type === "ERROR") {
        if (message.jobId === null) this.readyReject(message.error);
        if (this.activeTask && (message.jobId === null || message.jobId === this.activeTask.jobId)) this.activeTask.fail(message.error);
        return;
      }
      if (!this.activeTask || message.jobId !== this.activeTask.jobId) return;
      if (message.type === "PROGRESS") this.activeTask.progress(message.progress);
      else if (message.type === "CHECKPOINT") this.activeTask.paused(message.checkpoint);
      else if (message.type === "COMPLETED") this.activeTask.complete({ status: "completed", result: message.result });
      else if (message.type === "CANCELLED") this.activeTask.complete({ status: "cancelled" });
    } catch (error) {
      this.activeTask?.fail(toSceneEngineError(error));
    }
  };

  private readonly onWorkerError = (event: ErrorEvent) => {
    const error = sceneEngineError("INTERNAL_ERROR", event.message || "Scene engine worker stopped unexpectedly");
    this.readyReject(error);
    this.activeTask?.fail(error);
  };
}

class TaskController {
  readonly publicTask: SceneEngineTask;
  readonly jobId: string;
  isTerminal = false;
  private readonly resolveCompletion: (outcome: SceneTaskOutcome) => void;
  private readonly observer?: { onProgress(progress: SceneEngineProgress): void; signal?: AbortSignal };
  private readonly onTerminal: () => void;
  private pausePromise: Promise<import("../api/types.js").SceneEngineCheckpoint> | null = null;
  private resolvePause!: (checkpoint: import("../api/types.js").SceneEngineCheckpoint) => void;
  private rejectPause!: (error: unknown) => void;
  private command?: (message: MainToWorkerMessage) => void;
  private pauseRequested = false;
  private cancelRequested = false;

  constructor(jobId: string, observer: TaskController["observer"], onTerminal: () => void) {
    this.jobId = jobId;
    this.observer = observer;
    this.onTerminal = onTerminal;
    let resolve!: (outcome: SceneTaskOutcome) => void;
    const completion = new Promise<SceneTaskOutcome>((resolver) => {
      resolve = resolver;
    });
    this.resolveCompletion = resolve;
    this.publicTask = {
      jobId,
      completion,
      pause: () => this.pause(),
      cancel: () => this.cancel(),
    };
  }

  markStartedPending() {
    this.command = undefined;
  }

  attachCommand(command: (message: MainToWorkerMessage) => void) {
    this.command = command;
    if (this.pauseRequested) command({ type: "PAUSE", jobId: this.jobId });
    if (this.cancelRequested) command({ type: "CANCEL", jobId: this.jobId });
  }

  progress(progress: import("../api/types.js").SceneEngineProgress) {
    if (!this.isTerminal) this.observer?.onProgress(progress);
  }

  complete(outcome: SceneTaskOutcome) {
    if (this.isTerminal) return;
    this.isTerminal = true;
    this.resolveCompletion(outcome);
    this.onTerminal();
  }

  fail(error: SceneEngineError) {
    if (this.pausePromise) this.rejectPause(error);
    this.complete(failedOutcome(error));
  }

  paused(checkpoint: import("../api/types.js").SceneEngineCheckpoint) {
    if (this.pausePromise) this.resolvePause(checkpoint);
    this.complete({ status: "paused", checkpoint });
  }

  private pause(): Promise<import("../api/types.js").SceneEngineCheckpoint> {
    if (this.isTerminal) return Promise.reject(new Error("Scene task has already completed"));
    if (!this.pausePromise) {
      this.pausePromise = new Promise((resolve, reject) => {
        this.resolvePause = resolve;
        this.rejectPause = reject;
      });
      this.pauseRequested = true;
      this.command?.({ type: "PAUSE", jobId: this.jobId });
    }
    return this.pausePromise;
  }

  private async cancel(): Promise<void> {
    if (this.isTerminal) return;
    this.cancelRequested = true;
    this.command?.({ type: "CANCEL", jobId: this.jobId });
  }

  cancelFromAbort() {
    void this.cancel();
  }
}

let jobSequence = 0;

export function createSceneEngineClient(options: SceneEngineClientOptions): SceneEngineClientContract {
  const client = new DefaultSceneEngineClient(options);
  return client;
}
