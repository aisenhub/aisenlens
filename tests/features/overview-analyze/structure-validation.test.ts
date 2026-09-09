import test from "node:test"
import assert from "node:assert/strict"
import { validateStructureMembership } from "../../../apps/web/src/features/group/services/structureValidation.ts"
import { reconcileShotGroups } from "../../../apps/web/src/features/group/services/reconcileShotGroups.ts"
import type { ShotGroupRecord } from "../../../apps/web/src/features/group/types.ts"

const baseGroup = (kind: ShotGroupRecord["kind"], shotIds: string[], id = `${kind}-1`): ShotGroupRecord => ({ id, projectId: "p1", kind, title: id, summary: "", shotIds, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" })

test("allows a single-shot scene and keeps layers independently overlapable", () => {
  const scene = baseGroup("scene", ["s2"])
  assert.equal(validateStructureMembership({ kind: "scene", shotIds: scene.shotIds, existingGroups: [] }).valid, true)
  const sequence = baseGroup("sequence", ["s1", "s2", "s3"])
  assert.equal(validateStructureMembership({ kind: "sequence", shotIds: sequence.shotIds, existingGroups: [scene] }).valid, true)
})

test("rejects same-layer overlap and partial scene/sequence coverage", () => {
  const scene = baseGroup("scene", ["s2", "s3"])
  assert.equal(validateStructureMembership({ kind: "scene", shotIds: ["s3"], existingGroups: [scene] }).valid, false)
  assert.equal(validateStructureMembership({ kind: "sequence", shotIds: ["s1", "s2"], existingGroups: [scene] }).valid, false)
})

test("reconcile retains invalid structure for review instead of silently dropping content", () => {
  const result = reconcileShotGroups([baseGroup("scene", ["s1", "missing"])], ["s1"])
  assert.equal(result.length, 1)
  assert.equal(result[0].validity?.status, "needs-review")
  assert.match(result[0].validity?.reason ?? "", /不存在|连续/)
})
