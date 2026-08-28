import assert from "node:assert/strict";
import test from "node:test";
import { SceneEngineWorkerController, type WorkerFrameSource } from "../src/worker/scene-engine.worker.js";
import { DEFAULT_SCENE_DETECTION_CONFIG } from "../src/api/config.js";
import type { WasmRuntime } from "../src/worker/wasmRuntime.js";
import type { StartMessage, WorkerToMainMessage } from "../src/worker/protocol.js";

const frame = {
  pixelFormat: 2, bitDepth: 8, fullRange: true, codedWidth: 1, codedHeight: 1,
  visibleX: 0, visibleY: 0, visibleWidth: 1, visibleHeight: 1, matrix: 2, primaries: 2, transfer: 2,
  presentationIndex: 0, timestampUs: 0, durationUs: 1_000,
  planes: [{ data: new Uint8Array([0, 0, 0, 255]), strideBytes: 4, sizeBytes: 4 }],
};

function runtime(): WasmRuntime {
  return {
    abiVersion: 1,
    reserveFrame: () => ({ layout: { planeCount: 1, strides: [4], sizes: [4], totalBytes: 4 }, planes: [new Uint8Array(4)], copyDestination: new Uint8Array(4), planeOffsets: [0], write: () => undefined }),
    processFrame: () => [],
    flush: () => [],
    readEvents: () => ({ events: [], total: 0n }),
    exportCheckpoint: () => new Uint8Array([1, 2, 3]),
    importCheckpoint: () => undefined,
    dispose: () => undefined,
  };
}

function source(frames: readonly typeof frame[], gate?: { wait: Promise<void> }): WorkerFrameSource {
  return {
    durationUs: 10_000,
    codedWidth: 1,
    codedHeight: 1,
    async *frames() {
      if (gate) await gate.wait;
      yield* frames;
    },
    dispose: () => undefined,
  };
}

function startMessage(jobId: string): StartMessage {
  return { type: "START", jobId, source: new Blob(), mediaFingerprint: "sha256:test", config: DEFAULT_SCENE_DETECTION_CONFIG };
}

async function readyController(emitted: WorkerToMainMessage[], createFrameSource: (message: StartMessage) => WorkerFrameSource) {
  const controller = new SceneEngineWorkerController({
    initialize: async () => ({ backend: "wasm-baseline", version: "0.1.0" }),
    createRuntime: async () => runtime(),
    createFrameSource,
    emit: (message) => emitted.push(message),
    progressIntervalMs: 0,
  });
  controller.handle({ type: "INIT" });
  await Promise.resolve();
  return controller;
}

test("worker reaches completed terminal state and releases runtime/source", async () => {
  const emitted: WorkerToMainMessage[] = [];
  let sourceDisposed = false;
  const controller = await readyController(emitted, () => ({ ...source([frame]), dispose: () => { sourceDisposed = true; } }));
  controller.handle(startMessage("job-1"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(emitted.at(-1)?.type, "COMPLETED");
  assert.equal(sourceDisposed, true);
});

test("worker forwards a source-owned WASM target to the decoder", async () => {
  const emitted: WorkerToMainMessage[] = [];
  const target = runtime().reserveFrame(1, 1, 2);
  let receivedTarget: unknown;
  let reserved = false;
  const controller = await readyController(emitted, () => ({
    durationUs: 10_000,
    codedWidth: 1,
    codedHeight: 1,
    createFrameTarget: () => { reserved = true; return target; },
    async *frames(frameTarget) { receivedTarget = frameTarget; yield frame; },
    dispose: () => undefined,
  }));
  controller.handle(startMessage("job-target"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(reserved, true);
  assert.equal(receivedTarget, target);
  assert.equal(emitted.at(-1)?.type, "COMPLETED");
});

test("worker pauses only after a processed frame and emits a complete checkpoint", async () => {
  const emitted: WorkerToMainMessage[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const controller = await readyController(emitted, () => source([frame], { wait: gate }));
  controller.handle(startMessage("job-1"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  controller.handle({ type: "PAUSE", jobId: "job-1" });
  release();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const checkpoint = emitted.find((message) => message.type === "CHECKPOINT");
  assert.ok(checkpoint && checkpoint.checkpoint.coreState.byteLength === 3);
  assert.equal(emitted.at(-1)?.type, "CHECKPOINT");
});

test("worker cancellation and runtime failures both reach a single terminal message", async () => {
  const emitted: WorkerToMainMessage[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const controller = await readyController(emitted, () => source([frame], { wait: gate }));
  controller.handle(startMessage("job-cancel"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  controller.handle({ type: "CANCEL", jobId: "job-cancel" });
  release();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(emitted.at(-1)?.type, "CANCELLED");

  const failed: WorkerToMainMessage[] = [];
  const failing = new SceneEngineWorkerController({
    initialize: async () => ({ backend: "wasm-baseline", version: "0.1.0" }),
    createRuntime: async () => { throw new Error("runtime boom"); },
    createFrameSource: () => source([]),
    emit: (message) => failed.push(message),
  });
  failing.handle({ type: "INIT" });
  await Promise.resolve();
  failing.handle(startMessage("job-fail"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  const error = failed.find((message) => message.type === "ERROR" && message.jobId === "job-fail");
  assert.equal(error?.type, "ERROR");
  if (error?.type === "ERROR") assert.equal(error.error.code, "INTERNAL_ERROR");
});
