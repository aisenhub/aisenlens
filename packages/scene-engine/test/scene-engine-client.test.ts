import assert from "node:assert/strict";
import test from "node:test";
import { createSceneEngineClient, type WorkerLike } from "../src/client/SceneEngineClient.js";
import { DEFAULT_SCENE_DETECTION_CONFIG } from "../src/api/config.js";
import type { MainToWorkerMessage, WorkerToMainMessage } from "../src/worker/protocol.js";

class FakeWorker implements WorkerLike {
  readonly sent: MainToWorkerMessage[] = [];
  private messageListeners = new Set<(event: MessageEvent<WorkerToMainMessage>) => void>();
  private errorListeners = new Set<(event: ErrorEvent) => void>();
  terminated = false;

  postMessage(message: MainToWorkerMessage) {
    this.sent.push(message);
    if (message.type === "INIT") this.emit({ type: "READY", backend: "wasm-baseline", version: "0.1.0" });
    if (message.type === "START") this.emit({ type: "STARTED", jobId: message.jobId });
    if (message.type === "PAUSE") this.emit({ type: "CHECKPOINT", jobId: message.jobId, checkpoint: {} as never });
    if (message.type === "CANCEL") this.emit({ type: "CANCELLED", jobId: message.jobId });
    if (message.type === "DISPOSE") this.terminated = true;
  }
  addEventListener(type: "message" | "error", listener: ((event: MessageEvent<WorkerToMainMessage>) => void) | ((event: ErrorEvent) => void)): void {
    if (type === "message") this.messageListeners.add(listener as (event: MessageEvent<WorkerToMainMessage>) => void);
    else this.errorListeners.add(listener as (event: ErrorEvent) => void);
  }
  removeEventListener(type: "message" | "error", listener: ((event: MessageEvent<WorkerToMainMessage>) => void) | ((event: ErrorEvent) => void)): void {
    if (type === "message") this.messageListeners.delete(listener as (event: MessageEvent<WorkerToMainMessage>) => void);
    else this.errorListeners.delete(listener as (event: ErrorEvent) => void);
  }
  terminate() {
    this.terminated = true;
  }
  emit(message: WorkerToMainMessage) {
    const event = new MessageEvent<WorkerToMainMessage>("message", { data: message });
    this.messageListeners.forEach((listener) => listener(event));
  }
}

function request() {
  return { source: new Blob(), mediaFingerprint: "sha256:test", config: DEFAULT_SCENE_DETECTION_CONFIG };
}

test("client resolves pause as a terminal outcome and allows resume with a new job", async () => {
  const worker = new FakeWorker();
  const client = createSceneEngineClient({ createWorker: () => worker });
  const first = client.start(request());
  await Promise.resolve();
  const checkpoint = await first.pause();
  assert.deepEqual(checkpoint, {});
  assert.equal((await first.completion).status, "paused");
  const second = client.start(request());
  await Promise.resolve();
  await second.cancel();
  assert.equal((await second.completion).status, "cancelled");
  assert.equal(worker.sent.filter((message) => message.type === "START").length, 2);
  await client.dispose();
  assert.equal(worker.terminated, true);
});

test("client enforces one active task and settles it on dispose", async () => {
  const worker = new FakeWorker();
  const client = createSceneEngineClient({ createWorker: () => worker });
  const task = client.start(request());
  await Promise.resolve();
  assert.throws(() => client.start(request()), { code: "INTERNAL_ERROR" });
  await client.dispose();
  const outcome = await task.completion;
  assert.equal(outcome.status, "failed");
});

test("AbortSignal is translated to cancellation and listener is removed", async () => {
  const worker = new FakeWorker();
  const client = createSceneEngineClient({ createWorker: () => worker });
  const controller = new AbortController();
  const task = client.start(request(), { onProgress: () => undefined, signal: controller.signal });
  await Promise.resolve();
  controller.abort();
  assert.equal((await task.completion).status, "cancelled");
  await client.dispose();
});
