import assert from "node:assert/strict"
import test from "node:test"
import {
  clearWorkflowReturnContext,
  createWorkflowReturnContext,
  readWorkflowReturnContext,
  writeWorkflowReturnContext,
} from "../../../apps/webapp/src/features/workflow/services/workflowReturnContext.ts"

class MemorySessionStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

test("Return Context preserves origin, correction target and playback without entering project data", () => {
  const context = createWorkflowReturnContext(
    { projectId: "p1", workspace: "analysis", view: "shots", mode: "range", targetKind: "shot", targetId: "shot-2" },
    {
      selectedEntity: { kind: "shot", id: "shot-2" },
      correctionTarget: { kind: "boundary", id: "shot-2:right" },
      playbackTimeSeconds: 12.5,
      viewportHint: { surface: "timeline", anchorId: "shot-2" },
    },
  )
  assert.ok(context)
  const storage = new MemorySessionStorage()
  writeWorkflowReturnContext(context, storage)
  assert.deepEqual(readWorkflowReturnContext("p1", storage), context)
  clearWorkflowReturnContext("p1", storage)
  assert.equal(readWorkflowReturnContext("p1", storage), null)
})

test("Return Context rejects another project and invalid workspace/view pairs", () => {
  const storage = new MemorySessionStorage()
  storage.setItem("aisenlens.workflow.return-context.v1:p2", JSON.stringify({
    version: 1,
    projectId: "p1",
    origin: { workspace: "results", view: "shots" },
    createdAt: new Date().toISOString(),
  }))
  assert.equal(readWorkflowReturnContext("p2", storage), null)
  assert.equal(createWorkflowReturnContext({ projectId: null, workspace: "analysis", view: "shots" }), null)
})
