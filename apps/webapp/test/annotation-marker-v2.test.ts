import test from "node:test"
import assert from "node:assert/strict"
import { assertAnnotationMarker, migrateLegacyAnnotationMarker } from "../src/features/annotation/services/normalizeAnnotationMarker.ts"

test("migrates a legacy marker into the frame/content/scope contract", () => {
  const marker = migrateLegacyAnnotationMarker({
    id: "m1",
    projectId: "p1",
    frame: 48,
    shotId: "s2",
    category: "emotion",
    label: "情绪高点",
    note: "呼吸停顿",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:01.000Z",
  })
  assert.deepEqual(marker, {
    id: "m1",
    projectId: "p1",
    frame: 48,
    content: "情绪高点\n呼吸停顿",
    scope: "free",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:01.000Z",
  })
  assert.doesNotThrow(() => assertAnnotationMarker(marker))
})

test("uses a visible category label when legacy content is empty", () => {
  const marker = migrateLegacyAnnotationMarker({ id: "m2", projectId: "p1", frame: 0, category: "important", label: " ", note: "", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" })
  assert.equal(marker.content, "重要镜头")
  assert.equal(marker.scope, "free")
})

test("rejects blank v2 content", () => {
  assert.throws(() => assertAnnotationMarker({ id: "m1", projectId: "p1", frame: 1, content: " ", scope: "free", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }), /空白标记内容/)
})
