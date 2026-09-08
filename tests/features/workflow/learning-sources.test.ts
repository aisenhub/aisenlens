import assert from "node:assert/strict"
import test from "node:test"
import deriveLearningSources from "../../../apps/web/src/features/learn/services/deriveLearningSources.ts"

test("derives only non-empty real notes and summaries with stable source identity", () => {
  const sources = deriveLearningSources({
    shots: [
      { id: "same", start: 0, duration: 1, type: "未分析", motion: "未分析", color: "未分析" },
      { id: "empty", start: 1, duration: 1, type: "未分析", motion: "未分析", color: "未分析" },
    ],
    groups: [{ id: "same", projectId: "p", kind: "scene", title: "厨房", summary: "空间关系", shotIds: ["same", "empty"], createdAt: "", updatedAt: "" }],
    notes: { same: { content: "", analysis: "镜头观察" }, empty: { content: "   ", analysis: "" } },
  })
  assert.deepEqual(sources.map(({ kind, id }) => `${kind}:${id}`), ["shot:same", "group:same"])
  assert.equal(sources[0].excerpt, "镜头观察")
})
