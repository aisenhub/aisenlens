import assert from "node:assert/strict"
import test from "node:test"
import type { AnalysisRecord } from "../src/features/analysis/types.ts"
import {
  analysisEntriesByShotId,
  buildShotAnalysisRecords,
  getAnalysisContextManifestStaleReason,
  getAnalysisEligibility,
  reconcileAnalysisAfterStructureChange,
  shotNotesByShotId,
} from "../src/features/analysis/services/analysisRecordService.ts"

const timestamp = "2026-09-18T00:00:00.000Z"

function shot(endFrame = 10) {
  return { id: "shot-1", projectId: "project-1", order: 0, startFrame: 0, endFrame, status: "confirmed" as const, detection: null, primaryScreenshotId: null, screenshotIds: [], firstFrameScreenshotId: null, lastFrameScreenshotId: null, revision: 1, structureRevision: 1, lineage: { origin: "manual" as const, parentShotIds: [] }, createdAt: timestamp, updatedAt: timestamp }
}

test("formal shot analysis is stored as AnalysisRecord and UI note fields are derived", () => {
  const records = buildShotAnalysisRecords({
    projectId: "project-1",
    entriesByShotId: { "shot-1": { size: { state: "set", value: "shot.close" }, sound: { state: "unknown" } } },
    notesByShotId: { "shot-1": { content: "画面描述", analysis: "分析笔记" } },
    existingRecords: [],
    activeShotIds: ["shot-1"],
    profile: null,
    structureRevision: 1,
    now: timestamp,
  })
  assert.equal(records.length, 4)
  assert.deepEqual(analysisEntriesByShotId(records)["shot-1"].size, { state: "set", value: "shot.close" })
  assert.deepEqual(shotNotesByShotId(records)["shot-1"], { content: "画面描述", analysis: "分析笔记" })
})

test("unchanged stale record stays stale until explicit user edit", () => {
  const existing: AnalysisRecord = { id: "project-1:shot:shot-1:size", projectId: "project-1", subject: { kind: "shot", id: "shot-1" }, fieldId: "size", entry: { state: "set", value: "shot.close" }, status: "stale", staleReason: "shot-range-changed@2", provenance: { kind: "user" }, evidenceRefs: [], structureRevision: 1, createdAt: timestamp, updatedAt: timestamp, revision: 2 }
  const unchanged = buildShotAnalysisRecords({ projectId: "project-1", entriesByShotId: { "shot-1": { size: { state: "set", value: "shot.close" } } }, notesByShotId: {}, existingRecords: [existing], activeShotIds: ["shot-1"], profile: null, structureRevision: 2, now: timestamp })
  assert.equal(unchanged[0].status, "stale")
  const edited = buildShotAnalysisRecords({ projectId: "project-1", entriesByShotId: { "shot-1": { size: { state: "set", value: "shot.wide" } } }, notesByShotId: {}, existingRecords: [existing], activeShotIds: ["shot-1"], profile: null, structureRevision: 2, now: timestamp })
  assert.equal(edited[0].status, "confirmed")
})

test("shot range changes stale record and pending candidate", () => {
  const record: AnalysisRecord = { id: "project-1:shot:shot-1:size", projectId: "project-1", subject: { kind: "shot", id: "shot-1" }, fieldId: "size", entry: { state: "set", value: "shot.close" }, status: "confirmed", staleReason: null, provenance: { kind: "user" }, evidenceRefs: [], structureRevision: 1, createdAt: timestamp, updatedAt: timestamp, revision: 1 }
  const next = reconcileAnalysisAfterStructureChange({
    records: [record],
    candidates: [{ id: "candidate-1", projectId: "project-1", subject: { kind: "shot", id: "shot-1" }, fieldId: "size", proposedEntry: { state: "set", value: "shot.wide" }, status: "pending", evidenceRefs: [], contextManifestId: null, source: {}, dependencyRevision: { structureRevision: 1, analysisRevision: 0 }, acceptedRecordId: null, createdAt: timestamp, updatedAt: timestamp, revision: 1 }],
    evidence: [],
    previousShots: [shot(10)],
    nextShots: [shot(12)],
    invalidatedByRevision: 2,
    now: timestamp,
  })
  assert.equal(next.records[0].status, "stale")
  assert.equal(next.candidates[0].status, "stale")
})

test("required evidence controls Results eligibility only", () => {
  const record: AnalysisRecord = { id: "r", projectId: "p", subject: { kind: "shot", id: "s" }, fieldId: "intent", entry: { state: "set", value: "contrast" }, status: "confirmed", staleReason: null, provenance: { kind: "user" }, evidenceRefs: ["e"], structureRevision: 1, createdAt: timestamp, updatedAt: timestamp, revision: 1 }
  const definition = { fieldId: "intent", semanticKey: "shot.intent", scope: "shot" as const, label: "Intent", kind: "text" as const, options: [], evidencePolicy: "required" as const, capabilities: { aiSuggestable: true, timelineVisualizable: false, exportable: true }, definitionVersion: 1 }
  assert.deepEqual(getAnalysisEligibility(record, definition, []), { eligible: false, reasons: ["required-evidence-missing"] })
})

test("structure move keeps stable shot facts while split, merge and group changes require review", () => {
  const makeShot = (id: string, startFrame: number, endFrame: number, order: number) => ({
    id, projectId: "project-1", order, startFrame, endFrame, status: "confirmed" as const, detection: null,
    primaryScreenshotId: null, screenshotIds: [], firstFrameScreenshotId: null, lastFrameScreenshotId: null,
    revision: 1, structureRevision: 1, lineage: { origin: "manual" as const, parentShotIds: [] }, createdAt: timestamp, updatedAt: timestamp,
  })
  const makeRecord = (subject: { kind: "shot" | "scene"; id: string }): AnalysisRecord => ({
    id: `record-${subject.kind}-${subject.id}`, projectId: "project-1", subject, fieldId: "size",
    entry: { state: "set", value: "shot.close" }, status: "confirmed", staleReason: null, provenance: { kind: "user" },
    evidenceRefs: [], structureRevision: 1, createdAt: timestamp, updatedAt: timestamp, revision: 1,
  })
  const move = reconcileAnalysisAfterStructureChange({
    records: [makeRecord({ kind: "shot", id: "shot-1" })], candidates: [], evidence: [],
    previousShots: [makeShot("shot-1", 0, 10, 0), makeShot("shot-2", 10, 20, 1)],
    nextShots: [makeShot("shot-2", 10, 20, 0), makeShot("shot-1", 0, 10, 1)], invalidatedByRevision: 2,
  })
  assert.equal(move.records[0].status, "confirmed")

  const split = reconcileAnalysisAfterStructureChange({
    records: [makeRecord({ kind: "shot", id: "shot-1" })], candidates: [], evidence: [],
    previousShots: [makeShot("shot-1", 0, 20, 0)],
    nextShots: [makeShot("shot-1a", 0, 10, 0), makeShot("shot-1b", 10, 20, 1)], invalidatedByRevision: 2,
  })
  assert.equal(split.records[0].staleReason, "shot-identity-removed@2")

  const merge = reconcileAnalysisAfterStructureChange({
    records: [makeRecord({ kind: "shot", id: "shot-1" }), makeRecord({ kind: "shot", id: "shot-2" })], candidates: [], evidence: [],
    previousShots: [makeShot("shot-1", 0, 10, 0), makeShot("shot-2", 10, 20, 1)],
    nextShots: [makeShot("shot-1", 0, 20, 0)], invalidatedByRevision: 3,
  })
  assert.deepEqual(merge.records.map((record) => record.staleReason), ["shot-range-changed@3", "shot-identity-removed@3"])

  const group = reconcileAnalysisAfterStructureChange({
    records: [makeRecord({ kind: "scene", id: "scene-1" })], candidates: [], evidence: [],
    previousShots: [makeShot("shot-1", 0, 10, 0)], nextShots: [makeShot("shot-1", 0, 10, 0)],
    previousGroups: [{ id: "scene-1", projectId: "project-1", kind: "scene", title: "Scene", summary: "", shotIds: ["shot-1"], createdAt: timestamp, updatedAt: timestamp }],
    nextGroups: [{ id: "scene-1", projectId: "project-1", kind: "scene", title: "Scene", summary: "", shotIds: [], createdAt: timestamp, updatedAt: timestamp }],
    invalidatedByRevision: 4,
  })
  assert.equal(group.records[0].staleReason, "structure-membership-changed@4")
})

test("context manifests are immutable snapshots and become stale by dependency revision", () => {
  const manifest = { dependencyRevision: { structureRevision: 4, analysisRevision: 7 } }
  assert.equal(getAnalysisContextManifestStaleReason(manifest, manifest.dependencyRevision), null)
  assert.equal(getAnalysisContextManifestStaleReason(manifest, { structureRevision: 5, analysisRevision: 7 }), "context-structure-revision-changed")
  assert.equal(getAnalysisContextManifestStaleReason(manifest, { structureRevision: 4, analysisRevision: 8 }), "context-analysis-revision-changed")
})
