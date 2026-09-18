import assert from "node:assert/strict"
import test from "node:test"
import { buildResultsDataset } from "../src/features/results/services/buildResultsDataset.ts"
import { buildTimelineReadModel } from "../src/features/timeline/services/buildTimelineReadModel.ts"

const now = "2026-09-18T00:00:00.000Z"
const project = { id:"p", title:"P", description:"", shots:1, notes:0, folderId:null, coverScreenshotId:null, mediaAssets:[], primaryVideoAssetId:null, audioTracks:[], compositionOverlay:{} as never, contentOverlay:{} as never, structureRevision:4, analysisRevision:7, createdAt:now, updatedAt:now }
const shot = { id:"s", projectId:"p", order:0, startFrame:0, endFrame:24, status:"confirmed" as const, detection:null, primaryScreenshotId:null, screenshotIds:[], firstFrameScreenshotId:null, lastFrameScreenshotId:null, revision:2, structureRevision:4, lineage:{origin:"manual" as const,parentShotIds:[]}, createdAt:now, updatedAt:now }
const confirmed = { id:"r1", projectId:"p", subject:{kind:"shot" as const,id:"s"}, fieldId:"size", entry:{state:"set" as const,value:"close"}, status:"confirmed" as const, staleReason:null, provenance:{kind:"user" as const}, evidenceRefs:[], structureRevision:4, createdAt:now, updatedAt:now, revision:3 }
const stale = { ...confirmed, id:"r2", fieldId:"motion", status:"stale" as const, staleReason:"shot-range-changed@4" }

test("Results dataset consumes confirmed AnalysisRecord and excludes stale by default", () => {
  const result = buildResultsDataset({ project, shots:[shot], analysisRecords:[confirmed, stale], analysisEvidence:[], profile:null })
  assert.deepEqual(result.rows[0].cells.map((cell) => cell.fieldId), ["size"])
  assert.equal(result.structureRevision, 4)
  assert.equal(result.analysisRevision, 7)
})

test("Timeline is a derived read model over Shot and Analysis, not a second authority", () => {
  const model = buildTimelineReadModel({ project, shots:[shot], analysisRecords:[confirmed, stale] })
  assert.equal(model.items.filter((item) => item.trackId === "shots").length, 1)
  assert.equal(model.items.find((item) => item.id === "analysis:r2")?.status, "stale")
  assert.equal(model.structureRevision, 4)
})
