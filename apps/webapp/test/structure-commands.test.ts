import test from "node:test"
import assert from "node:assert/strict"
import {
  createStructureFromSelection,
  demoteStructureBoundary,
  mergeAdjacentStructures,
  promoteStructureBoundary,
  resolveStructureSpanAtBoundary,
  resizeStructureEdge,
  splitStructureAtBoundary,
} from "../src/features/group/services/structureCommands.ts"
import type { ShotGroupRecord } from "../src/features/group/types.ts"

const orderedShots = ["s1", "s2", "s3", "s4"].map((id, index) => ({ id, startFrame: index * 10, endFrame: (index + 1) * 10 }))
const group = (kind: ShotGroupRecord["kind"], shotIds: string[], id: string, title = id): ShotGroupRecord => ({ id, projectId: "p1", kind, shotIds, title, summary: "", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" })

test("creates structure from a continuous selection and rejects partial overlap", () => {
  const scene = createStructureFromSelection({ projectId: "p1", kind: "scene", selectedShotIds: ["s2", "s3"], orderedShots, existingGroups: [], now: "2026-01-01T00:00:00.000Z" })
  assert.equal(scene.ok, true)
  if (!scene.ok) return
  const partial = createStructureFromSelection({ projectId: "p1", kind: "sequence", selectedShotIds: ["s1", "s2"], orderedShots, existingGroups: scene.groups, now: "2026-01-01T00:00:00.000Z" })
  assert.equal(partial.ok, false)
})

test("splits a structure while preserving the left identity", () => {
  const original = group("scene", ["s1", "s2", "s3"], "scene-1", "保留标题")
  const result = splitStructureAtBoundary({ projectId: "p1", kind: "scene", afterShotId: "s1", groupId: original.id, orderedShots, existingGroups: [original], now: "2026-01-01T00:00:00.000Z" })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.groups[0]?.id, "scene-1")
  assert.deepEqual(result.groups[0]?.shotIds, ["s1"])
  assert.deepEqual(result.groups[1]?.shotIds, ["s2", "s3"])
})

test("resolves a boundary inside an existing structure as a split", () => {
  const original = group("scene", ["s1", "s2", "s3"], "scene-1", "保留标题")
  const result = resolveStructureSpanAtBoundary({ projectId: "p1", kind: "scene", afterShotId: "s2", orderedShots, existingGroups: [original], now: "2026-01-01T00:00:00.000Z" })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.groups.map((item) => item.shotIds), [["s1", "s2"], ["s3"]])
  assert.equal(result.groups[0]?.id, original.id)
  assert.equal(result.groups[0]?.title, "保留标题")
})

test("promote adds a higher boundary and demote removes only that boundary", () => {
  const scene = group("scene", ["s1", "s2"], "scene-1")
  const promoted = promoteStructureBoundary({ projectId: "p1", orderedShots, existingGroups: [scene], groupId: scene.id, now: "2026-01-01T00:00:00.000Z" })
  assert.equal(promoted.ok, true)
  if (!promoted.ok) return
  assert.equal(promoted.groups.filter((item) => item.kind === "scene").length, 1)
  assert.equal(promoted.groups.filter((item) => item.kind === "sequence").length, 1)
  const sequence = promoted.groups.find((item) => item.kind === "sequence")!
  const demoted = demoteStructureBoundary({ projectId: "p1", orderedShots, existingGroups: promoted.groups, groupId: sequence.id, now: "2026-01-01T00:00:00.000Z" })
  assert.equal(demoted.ok, true)
  if (demoted.ok) assert.deepEqual(demoted.groups.map((item) => item.id), [scene.id])
})

test("requires explicit confirmation before discarding right-hand metadata", () => {
  const left = group("scene", ["s1"], "left")
  const right = { ...group("scene", ["s2"], "right"), title: "用户标题", summary: "用户内容" }
  const blocked = mergeAdjacentStructures({ projectId: "p1", kind: "scene", orderedShots, existingGroups: [left, right], leftGroupId: left.id, rightGroupId: right.id, now: "2026-01-01T00:00:00.000Z" })
  assert.equal(blocked.ok, false)
  const merged = mergeAdjacentStructures({ projectId: "p1", kind: "scene", orderedShots, existingGroups: [left, right], leftGroupId: left.id, rightGroupId: right.id, discardRightContent: true, now: "2026-01-01T00:00:00.000Z" })
  assert.equal(merged.ok, true)
})

test("creates a sparse range at a new boundary without inventing a parent tree", () => {
  const result = resolveStructureSpanAtBoundary({ projectId: "p1", kind: "scene", afterShotId: "s2", orderedShots, existingGroups: [], now: "2026-01-01T00:00:00.000Z" })
  assert.equal(result.ok, true)
  if (result.ok) assert.deepEqual(result.groups.map((item) => item.shotIds), [["s1", "s2"], ["s3", "s4"]])
})

test("resizes an isolated structure edge without mutating unrelated groups", () => {
  const scene = group("scene", ["s2", "s3"], "scene-1")
  const unrelated = group("sequence", ["s4"], "sequence-1")
  const result = resizeStructureEdge({ projectId: "p1", kind: "scene", groupId: scene.id, edge: "start", targetShotId: "s1", orderedShots, existingGroups: [scene, unrelated], now: "2026-01-01T00:00:00.000Z" })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.groups.find((item) => item.id === scene.id)?.shotIds, ["s1", "s2", "s3"])
  assert.deepEqual(result.groups.find((item) => item.id === unrelated.id)?.shotIds, ["s4"])
})
