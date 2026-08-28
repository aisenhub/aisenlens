import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionAutoShotTask } from "../src/features/auto-shot/taskState.ts";

test("auto-shot task state allows only explicit lifecycle transitions", () => {
  assert.equal(canTransitionAutoShotTask("running", "paused"), true);
  assert.equal(canTransitionAutoShotTask("paused", "running"), true);
  assert.equal(canTransitionAutoShotTask("running", "completed"), true);
  assert.equal(canTransitionAutoShotTask("completed", "running"), false);
  assert.equal(canTransitionAutoShotTask("failed", "paused"), false);
  assert.equal(canTransitionAutoShotTask("cancelled", "cancelled"), true);
});
