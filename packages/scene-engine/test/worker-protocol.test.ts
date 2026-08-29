import assert from "node:assert/strict"
import test from "node:test"
import {
  INITIAL_WORKER_PROTOCOL_STATE,
  transitionWorkerProtocol,
} from "../src/worker/protocol.js"

const ready = () =>
  transitionWorkerProtocol(
    transitionWorkerProtocol(INITIAL_WORKER_PROTOCOL_STATE, { type: "INIT" })
      .state,
    { type: "READY", backend: "wasm-baseline", version: "0.1.0" },
  ).state

test("accepts init, start, progress, pause/checkpoint and a new job", () => {
  let state = ready()
  state = transitionWorkerProtocol(state, {
    type: "START",
    jobId: "job-1",
    source: new Blob(),
    mediaIdentityDigest: "sha256:x",
    config: {} as never,
  }).state
  state = transitionWorkerProtocol(state, {
    type: "STARTED",
    jobId: "job-1",
  }).state
  state = transitionWorkerProtocol(state, {
    type: "PROGRESS",
    jobId: "job-1",
    progress: {
      processedUs: 1,
      durationUs: 2,
      decodedFrames: 1,
      newBoundaries: [],
      totalBoundaries: 0,
    },
  }).state
  state = transitionWorkerProtocol(state, {
    type: "PAUSE",
    jobId: "job-1",
  }).state
  state = transitionWorkerProtocol(state, {
    type: "PROGRESS",
    jobId: "job-1",
    progress: {
      processedUs: 2,
      durationUs: 2,
      decodedFrames: 2,
      newBoundaries: [],
      totalBoundaries: 0,
    },
  }).state
  state = transitionWorkerProtocol(state, {
    type: "CHECKPOINT",
    jobId: "job-1",
    checkpoint: {} as never,
  }).state
  assert.equal(state.phase, "ready")
  state = transitionWorkerProtocol(state, {
    type: "START",
    jobId: "job-2",
    source: new Blob(),
    mediaIdentityDigest: "sha256:y",
    config: {} as never,
  }).state
  assert.equal(state.currentJobId, "job-2")
})

test("rejects invalid order and ignores stale job messages", () => {
  assert.throws(() =>
    transitionWorkerProtocol(INITIAL_WORKER_PROTOCOL_STATE, {
      type: "READY",
      backend: "wasm-baseline",
      version: "x",
    }),
  )
  const state = transitionWorkerProtocol(ready(), {
    type: "START",
    jobId: "job-1",
    source: new Blob(),
    mediaIdentityDigest: "x",
    config: {} as never,
  }).state
  const stale = transitionWorkerProtocol(state, {
    type: "PROGRESS",
    jobId: "old-job",
    progress: {
      processedUs: 0,
      durationUs: 0,
      decodedFrames: 0,
      newBoundaries: [],
      totalBoundaries: 0,
    },
  })
  assert.equal(stale.ignored, true)
  assert.equal(stale.state.currentJobId, "job-1")
  assert.throws(() =>
    transitionWorkerProtocol(state, { type: "CANCELLED", jobId: "job-1" }),
  )
})

test("cancel has one terminal transition and dispose is idempotent", () => {
  let state = transitionWorkerProtocol(ready(), {
    type: "START",
    jobId: "job-1",
    source: new Blob(),
    mediaIdentityDigest: "x",
    config: {} as never,
  }).state
  state = transitionWorkerProtocol(state, {
    type: "CANCEL",
    jobId: "job-1",
  }).state
  state = transitionWorkerProtocol(state, {
    type: "CANCELLED",
    jobId: "job-1",
  }).state
  assert.equal(state.phase, "ready")
  state = transitionWorkerProtocol(state, { type: "DISPOSE" }).state
  assert.equal(state.phase, "disposed")
  assert.equal(
    transitionWorkerProtocol(state, { type: "DISPOSE" }).ignored,
    true,
  )
})
