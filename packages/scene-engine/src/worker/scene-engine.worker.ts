import { sceneEngineError, toSceneEngineError } from "../api/errors.js";
import { normalizeSceneResult } from "../result/normalizeResult.js";
import type { SceneEngineCheckpoint, SceneEngineProgress, SceneEvent, SceneTaskOutcome } from "../api/types.js";
import type { WasmFrameBuffer, WasmFrameInput, WasmRuntime } from "./wasmRuntime.js";
import { SingleFrameBufferPool } from "./frameBufferPool.js";
import { INITIAL_WORKER_PROTOCOL_STATE, transitionWorkerProtocol, type StartMessage, type WorkerProtocolState, type WorkerToMainMessage, type MainToWorkerMessage } from "./protocol.js";

export interface WorkerFrameSource {
  readonly durationUs: number;
  readonly codedWidth: number;
  readonly codedHeight: number;
  /** Optional source-specific reservation so decoded planes can land in WASM memory directly. */
  createFrameTarget?(runtime: WasmRuntime): WasmFrameBuffer;
  frames(target?: WasmFrameBuffer): AsyncIterable<WasmFrameInput>;
  dispose(): Promise<void> | void;
}

export interface SceneEngineWorkerOptions {
  initialize(): Promise<{ backend: "wasm-baseline" | "wasm-simd"; version: string }>;
  createRuntime(config: StartMessage["config"]): Promise<WasmRuntime>;
  createFrameSource(message: StartMessage): WorkerFrameSource | Promise<WorkerFrameSource>;
  emit(message: WorkerToMainMessage): void;
  progressIntervalMs?: number;
}

export interface WorkerMessagePort {
  addEventListener(type: "message", listener: (event: MessageEvent<MainToWorkerMessage>) => void): void;
  postMessage(message: WorkerToMainMessage): void;
}

interface ActiveJob {
  message: StartMessage;
  runtime: WasmRuntime;
  source: WorkerFrameSource;
  engineVersion: string;
  configHash: { text: string; value: bigint };
  boundaries: ReturnType<typeof normalizeSceneResult>["boundaries"];
  processedUs: number;
  decodedFrames: number;
  reportedBoundaries: number;
  lastProgressAt: number;
  pauseRequested: boolean;
  cancelRequested: boolean;
  bufferPool: SingleFrameBufferPool;
  frameTarget?: WasmFrameBuffer;
}

function configHash(config: StartMessage["config"]): { text: string; value: bigint } {
  const text = JSON.stringify(config);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  const value = BigInt(hash >>> 0);
  return { text: `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`, value };
}

function checkpointFor(job: ActiveJob, frame: WasmFrameInput): SceneEngineCheckpoint {
  return {
    schemaVersion: 1,
    engineVersion: job.engineVersion,
    configHash: job.configHash.text,
    mediaFingerprint: job.message.mediaFingerprint,
    resumeAfter: {
      timestampUs: frame.timestampUs,
      timestampOrdinal: frame.presentationIndex,
      nextPresentationIndex: frame.presentationIndex + 1,
    },
    committedBoundaries: job.boundaries,
    coreState: new Uint8Array(job.runtime.exportCheckpoint(job.configHash.value)).slice().buffer as ArrayBuffer,
  };
}

export class SceneEngineWorkerController {
  private state: WorkerProtocolState = INITIAL_WORKER_PROTOCOL_STATE;
  private active: ActiveJob | null = null;
  private disposed = false;
  private backend: "wasm-baseline" | "wasm-simd" = "wasm-baseline";
  private version = "unknown";
  private readonly progressIntervalMs: number;

  constructor(private readonly options: SceneEngineWorkerOptions) {
    this.progressIntervalMs = options.progressIntervalMs ?? 250;
  }

  handle(message: MainToWorkerMessage): void {
    if (this.disposed) return;
    if (message.type === "INIT") {
      this.state = transitionWorkerProtocol(this.state, message).state;
      void this.initialize();
      return;
    }
    if (message.type === "DISPOSE") {
      this.state = transitionWorkerProtocol(this.state, message).state;
      this.disposed = true;
      void this.cleanup();
      return;
    }
    if (message.type === "START") {
      this.state = transitionWorkerProtocol(this.state, message).state;
      void this.start(message);
      return;
    }
    if (message.type === "PAUSE") {
      if (this.active?.message.jobId === message.jobId) {
        this.state = transitionWorkerProtocol(this.state, message).state;
        this.active.pauseRequested = true;
      }
      return;
    }
    if (message.type === "CANCEL" && this.active?.message.jobId === message.jobId) {
      this.state = transitionWorkerProtocol(this.state, message).state;
      this.active.cancelRequested = true;
    }
  }

  private async initialize() {
    try {
      const result = await this.options.initialize();
      this.backend = result.backend;
      this.version = result.version;
      this.emit({ type: "READY", backend: this.backend, version: this.version });
    } catch (error) {
      this.emit({ type: "ERROR", jobId: null, error: toSceneEngineError(error) });
    }
  }

  private async start(message: StartMessage) {
    let source: WorkerFrameSource | undefined;
    let runtime: WasmRuntime | undefined;
    try {
      runtime = await this.options.createRuntime(message.config);
      source = await this.options.createFrameSource(message);
      const job: ActiveJob = {
        message,
        runtime,
        source,
        engineVersion: this.version,
        configHash: configHash(message.config),
        boundaries: [],
        processedUs: 0,
        decodedFrames: 0,
        reportedBoundaries: 0,
        lastProgressAt: 0,
        pauseRequested: false,
        cancelRequested: false,
        bufferPool: new SingleFrameBufferPool(runtime),
        frameTarget: source.createFrameTarget?.(runtime),
      };
      this.active = job;
      this.emit({ type: "STARTED", jobId: message.jobId });
      for await (const frame of source.frames(job.frameTarget)) {
        if (job.cancelRequested) {
          this.emit({ type: "CANCELLED", jobId: message.jobId });
          return;
        }
        // Media sources may have copied directly into their reserved target. For
        // generic sources, runtime.write performs the one required copy instead.
        if (!job.frameTarget) job.bufferPool.acquire(frame.codedWidth, frame.codedHeight, frame.pixelFormat);
        const events = runtime.processFrame(frame);
        this.record(job, events);
        job.decodedFrames += 1;
        job.processedUs = Math.max(job.processedUs, frame.timestampUs + frame.durationUs);
        if (!job.pauseRequested) this.emitProgress(job);
        if (job.pauseRequested) {
          const checkpoint = checkpointFor(job, frame);
          this.emit({ type: "CHECKPOINT", jobId: job.message.jobId, checkpoint });
          return;
        }
      }
      if (job.cancelRequested) {
        this.emit({ type: "CANCELLED", jobId: job.message.jobId });
        return;
      }
      this.record(job, runtime.flush());
      this.emit({
        type: "COMPLETED",
        jobId: job.message.jobId,
        result: {
          ...normalizeSceneResult({
          engineVersion: job.engineVersion,
          configHash: job.configHash.text,
          media: { durationUs: source.durationUs, decodedFrames: job.decodedFrames, codedWidth: source.codedWidth, codedHeight: source.codedHeight },
          events: [],
          diagnostics: { backend: this.backend },
          }),
          boundaries: job.boundaries,
        },
      });
    } catch (error) {
      this.emit({ type: "ERROR", jobId: message.jobId, error: toSceneEngineError(error) });
    } finally {
      await this.cleanup(runtime, source);
    }
  }

  private record(job: ActiveJob, events: readonly SceneEvent[]) {
    if (events.length === 0) return;
    const result = normalizeSceneResult({
      engineVersion: job.engineVersion,
      configHash: job.configHash.text,
      media: { durationUs: job.source.durationUs, decodedFrames: job.decodedFrames, codedWidth: job.source.codedWidth, codedHeight: job.source.codedHeight },
      events,
      diagnostics: { backend: this.backend },
    });
    job.boundaries.push(...result.boundaries);
  }

  private emitProgress(job: ActiveJob) {
    const now = Date.now();
    if (job.lastProgressAt !== 0 && now - job.lastProgressAt < this.progressIntervalMs) return;
    job.lastProgressAt = now;
    const newBoundaries = job.boundaries.slice(job.reportedBoundaries);
    job.reportedBoundaries = job.boundaries.length;
    const progress: SceneEngineProgress = { processedUs: job.processedUs, durationUs: job.source.durationUs, decodedFrames: job.decodedFrames, newBoundaries, totalBoundaries: job.boundaries.length };
    this.emit({ type: "PROGRESS", jobId: job.message.jobId, progress });
  }

  private emit(message: WorkerToMainMessage) {
    const transition = transitionWorkerProtocol(this.state, message);
    this.state = transition.state;
    if (!transition.ignored) this.options.emit(message);
  }

  private async cleanup(runtime = this.active?.runtime, source = this.active?.source) {
    const active = this.active;
    this.active = null;
    active?.bufferPool.release();
    try {
      source?.dispose();
    } finally {
      runtime?.dispose();
    }
  }
}

/** Adapter used by a real module Worker entry; it contains no browser/media policy itself. */
export function installSceneEngineWorker(port: WorkerMessagePort, options: Omit<SceneEngineWorkerOptions, "emit">): SceneEngineWorkerController {
  const controller = new SceneEngineWorkerController({ ...options, emit: (message) => port.postMessage(message) });
  port.addEventListener("message", (event) => controller.handle(event.data));
  return controller;
}
