import assert from "node:assert/strict";
import test from "node:test";
import { canPersistPausedAutoShotTask, canTransitionAutoShotTask, recoverAutoShotTaskStatus, toRuntimeTaskLifecycleState } from "../src/features/auto-shot/taskState.ts";

test("auto-shot task state allows only explicit lifecycle transitions", () => {
  assert.equal(canTransitionAutoShotTask("running", "paused"), true);
  assert.equal(canTransitionAutoShotTask("paused", "running"), true);
  assert.equal(canTransitionAutoShotTask("running", "completed"), true);
  assert.equal(canTransitionAutoShotTask("completed", "running"), false);
  assert.equal(canTransitionAutoShotTask("failed", "paused"), false);
  assert.equal(canTransitionAutoShotTask("cancelled", "cancelled"), true);
});

test("auto-shot task states adapt to the shared runtime lifecycle without changing persisted states", () => {
  assert.deepEqual(toRuntimeTaskLifecycleState("running"), { status: "running", suspension: null });
  assert.deepEqual(toRuntimeTaskLifecycleState("paused"), { status: "running", suspension: "paused" });
  assert.deepEqual(toRuntimeTaskLifecycleState("completed"), { status: "succeeded", suspension: null });
  assert.deepEqual(toRuntimeTaskLifecycleState("interrupted"), { status: "failed", suspension: "interrupted" });
});

test("paused is only valid with a complete checkpoint and stale running is interrupted", () => {
  assert.equal(canPersistPausedAutoShotTask(null), false);
  assert.equal(canPersistPausedAutoShotTask({ schemaVersion: 1, engineVersion: "wasm", configHash: "hash", mediaIdentityDigest: "identity", resumeAfter: { timestampUs: 1, timestampOrdinal: 0, nextPresentationIndex: 1 }, committedBoundaries: [], coreState: new ArrayBuffer(0) }), true);
  assert.equal(recoverAutoShotTaskStatus("running", null), "interrupted");
  assert.equal(recoverAutoShotTaskStatus("paused", null), "interrupted");
  assert.equal(recoverAutoShotTaskStatus("paused", { schemaVersion: 1, engineVersion: "wasm", configHash: "hash", mediaIdentityDigest: "identity", resumeAfter: { timestampUs: 1, timestampOrdinal: 0, nextPresentationIndex: 1 }, committedBoundaries: [], coreState: new ArrayBuffer(0) }), "paused");
});
