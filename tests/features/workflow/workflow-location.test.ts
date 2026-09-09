import test from "node:test"
import assert from "node:assert/strict"
import { createWorkflowSearch, parseWorkflowLocation } from "../../../apps/web/src/features/workflow/services/workflowLocation.ts"

test("parses a valid project stage and view", () => {
  assert.deepEqual(parseWorkflowLocation("?project=p1&stage=overview&view=structure"), {
    projectId: "p1",
    stage: "overview",
    view: "structure",
  })
})

test("falls back to a safe stage view without dropping project", () => {
  assert.deepEqual(parseWorkflowLocation("?project=p1&stage=unknown&view=private"), {
    projectId: "p1",
    stage: "prepare",
    view: "media",
  })
})

test("opens a project in preparation when no stage is requested", () => {
  assert.deepEqual(parseWorkflowLocation("?project=p1"), {
    projectId: "p1",
    stage: "prepare",
    view: "media",
  })
})

test("preserves unrelated query params when navigating", () => {
  const params = createWorkflowSearch("?project=p1&foo=keep", {
    stage: "learn",
    view: "notes",
  })
  assert.equal(params.get("foo"), "keep")
  assert.equal(params.get("stage"), "learn")
  assert.equal(params.get("view"), "notes")
})
