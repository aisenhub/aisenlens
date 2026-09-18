import test from "node:test"
import assert from "node:assert/strict"
import { createWorkflowSearch, parseWorkflowLocation } from "../../../apps/webapp/src/features/workflow/services/workflowLocation.ts"

test("parses a valid project workspace and view", () => {
  assert.deepEqual(parseWorkflowLocation("?project=p1&workspace=analysis&view=structure"), {
    projectId: "p1",
    workspace: "analysis",
    view: "structure",
  })
})

test("falls back to a safe workspace view without dropping project", () => {
  assert.deepEqual(parseWorkflowLocation("?project=p1&workspace=unknown&view=private"), {
    projectId: "p1",
    workspace: "preparation",
    view: "media",
  })
})

test("opens a project in preparation when no workspace is requested", () => {
  assert.deepEqual(parseWorkflowLocation("?project=p1"), {
    projectId: "p1",
    workspace: "preparation",
    view: "media",
  })
})

test("preserves unrelated query params when navigating", () => {
  const params = createWorkflowSearch("?project=p1&foo=keep", {
    workspace: "analysis",
    view: "notes",
  })
  assert.equal(params.get("foo"), "keep")
  assert.equal(params.get("workspace"), "analysis")
  assert.equal(params.get("view"), "notes")
})

test("canonical writer removes obsolete stage params", () => {
  const params = createWorkflowSearch("?project=p1&stage=analyze&view=shots", {
    workspace: "analysis",
    view: "shots",
  })
  assert.equal(params.has("stage"), false)
  assert.equal(params.get("workspace"), "analysis")
})
