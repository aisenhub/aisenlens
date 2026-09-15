import test from "node:test"
import assert from "node:assert/strict"
import { applyShotMergeToGroups, applyShotSplitToGroups } from "../src/features/shot/services/shotStructureChanges.ts"
import type { ShotGroupRecord } from "../src/features/group/types.ts"

const ordered = ["s1", "s2", "s3"].map((id) => ({ id }))
const group = (kind: ShotGroupRecord["kind"], shotIds: string[], id: string): ShotGroupRecord => ({ id, projectId: "p1", kind, shotIds, title: id, summary: "", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" })

test("split inherits every containing structure and keeps it contiguous", () => {
  const result = applyShotSplitToGroups({ groups: [group("scene", ["s1", "s2", "s3"], "scene-1")], orderedShotIds: ["s1", "s2", "s3"], originalShotId: "s2", newShotId: "s2b", now: "2026-01-02T00:00:00.000Z" })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.groups[0]?.shotIds, ["s1", "s2", "s2b", "s3"])
  assert.deepEqual(result.changes.rangeChangedGroupIds, ["scene-1"])
})

test("merge replaces the removed member and cleans stale group references", () => {
  const result = applyShotMergeToGroups({ groups: [group("scene", ["s2", "s3"], "scene-1")], orderedShotIds: ["s1", "s2", "s3"], retainedShotId: "s2", removedShotId: "s3", now: "2026-01-02T00:00:00.000Z" })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.groups[0]?.shotIds, ["s2"])
  assert.deepEqual(result.changes.rangeChangedGroupIds, ["scene-1"])
})

test("merge rejects divergent same-level structure membership", () => {
  const result = applyShotMergeToGroups({ groups: [group("scene", ["s1"], "scene-1"), group("scene", ["s2"], "scene-2")], orderedShotIds: ["s1", "s2", "s3"], retainedShotId: "s1", removedShotId: "s2", now: "2026-01-02T00:00:00.000Z" })
  assert.equal(result.ok, false)
})
