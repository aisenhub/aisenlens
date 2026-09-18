import assert from "node:assert/strict"
import test from "node:test"
import { remapAnalysisBackupData } from "../src/features/project/services/projectBackupRemap.ts"
import { decodeBackupArchive, encodeBackupArchive } from "../src/features/project/services/projectBackupArchiveCodec.ts"

const now = "2026-09-18T00:00:00.000Z"
let idCounter = 0
const createId = () => "new-" + (++idCounter)

test("backup v4 remaps Analysis, Evidence, Candidate and Context Manifest references together", () => {
  const result = remapAnalysisBackupData({
    newProjectId: "project-new",
    now,
    createId,
    shotIdMap: new Map([["shot-old", "shot-new"]]),
    groupIdMap: new Map([["scene-old", "scene-new"]]),
    screenshotIdMap: new Map([["screen-old", "screen-new"]]),
    markerIdMap: new Map([["marker-old", "marker-new"]]),
    assetIdMap: new Map([["asset-old", "asset-new"]]),
    records: [{
      id: "record-old", projectId: "project-old", subject: { kind: "scene", id: "scene-old" }, fieldId: "intent",
      entry: { state: "set", value: "contrast" }, status: "confirmed", staleReason: null, provenance: { kind: "user" },
      evidenceRefs: ["evidence-old"], structureRevision: 3, createdAt: now, updatedAt: now, revision: 4,
    }],
    candidates: [{
      id: "candidate-old", projectId: "project-old", subject: { kind: "shot", id: "shot-old" }, fieldId: "size",
      proposedEntry: { state: "set", value: "close" }, status: "accepted", evidenceRefs: ["evidence-old"],
      contextManifestId: "manifest-old", source: {}, dependencyRevision: { structureRevision: 3, analysisRevision: 5 },
      acceptedRecordId: "record-old", createdAt: now, updatedAt: now, revision: 2,
    }],
    evidence: [{
      id: "evidence-old", projectId: "project-old",
      ref: { id: "ref-old", kind: "screenshot", projectId: "project-old", mediaIdentityDigest: "digest", screenshotId: "screen-old" },
      status: "valid", staleReason: null, recordId: "record-old", candidateId: "candidate-old", boundRevision: 3,
      createdAt: now, updatedAt: now, revision: 2,
    }],
    contextManifests: [{
      id: "manifest-old", projectId: "project-old", taskKind: "shot-analysis", subject: { kind: "shot", id: "shot-old" },
      dependencyRevision: { structureRevision: 3, analysisRevision: 5 }, promptDefinitionId: "prompt", promptDefinitionVersion: 1,
      contextDefinitionId: "context", contextDefinitionVersion: 2, evidenceRefs: ["evidence-old"], includedFieldIds: ["size"],
      mediaRanges: [{ startFrame: 0, endFrame: 24 }], createdAt: now,
    }],
  })

  assert.equal(result.records[0].projectId, "project-new")
  assert.equal(result.records[0].subject.id, "scene-new")
  assert.equal(result.candidates[0].subject.id, "shot-new")
  assert.equal(result.candidates[0].acceptedRecordId, result.records[0].id)
  assert.equal(result.candidates[0].contextManifestId, result.contextManifests[0].id)
  assert.deepEqual(result.records[0].evidenceRefs, [result.evidence[0].id])
  assert.deepEqual(result.contextManifests[0].evidenceRefs, [result.evidence[0].id])
  assert.equal(result.evidence[0].recordId, result.records[0].id)
  assert.equal(result.evidence[0].candidateId, result.candidates[0].id)
  assert.equal(result.evidence[0].ref.kind, "screenshot")
  if (result.evidence[0].ref.kind === "screenshot") {
    assert.equal(result.evidence[0].ref.projectId, "project-new")
    assert.equal(result.evidence[0].ref.screenshotId, "screen-new")
  }

  const structuredRefs = [
    { id: "frame-ref", kind: "frame", projectId: "project-old", mediaIdentityDigest: "digest", frame: 12 },
    { id: "range-ref", kind: "range", projectId: "project-old", mediaIdentityDigest: "digest", startFrame: 12, endFrame: 24 },
    { id: "dialogue-ref", kind: "dialogue", projectId: "project-old", mediaIdentityDigest: "digest", dialogueId: "dialogue-1" },
    { id: "stat-ref", kind: "statistic", projectId: "project-old", mediaIdentityDigest: "digest", metric: "cut-rate", value: 0.5 },
  ] as const
  for (const ref of structuredRefs) {
    const remapped = remapAnalysisBackupData({
      newProjectId: "project-new", now, createId, shotIdMap: new Map(), groupIdMap: new Map(), screenshotIdMap: new Map(), markerIdMap: new Map(), assetIdMap: new Map(),
      records: [], candidates: [], contextManifests: [], evidence: [{ id: `evidence-${ref.id}`, projectId: "project-old", ref, status: "valid", staleReason: null, recordId: null, candidateId: null, boundRevision: null, createdAt: now, updatedAt: now, revision: 1 }],
    })
    assert.equal(remapped.evidence[0].ref.projectId, "project-new")
  }
})


test("backup v4 archive encode/decode round-trips canonical authority data", () => {
  const manifest = {
    format: "aisenlens-project-backup",
    version: 4,
    exportedAt: now,
    project: {
      id: "project-old",
      title: "Backup fixture",
      description: "",
      shots: 0,
      notes: 0,
      folderId: null,
      coverScreenshotId: null,
      mediaAssets: [],
      primaryVideoAssetId: null,
      audioTracks: [],
      compositionOverlay: {} as never,
      contentOverlay: {} as never,
      structureRevision: 3,
      analysisRevision: 5,
      createdAt: now,
      updatedAt: now,
    },
    shots: [],
    groups: [],
    markers: [],
    template: null,
    researchRanges: [],
    researchContexts: [],
    analysisRecords: [{
      id: "record-old",
      projectId: "project-old",
      subject: { kind: "film", id: "project-old" },
      fieldId: "intent",
      entry: { state: "set", value: "contrast" },
      status: "confirmed",
      staleReason: null,
      provenance: { kind: "user" },
      evidenceRefs: ["evidence-old"],
      structureRevision: 3,
      createdAt: now,
      updatedAt: now,
      revision: 2,
    }],
    analysisCandidates: [{
      id: "candidate-old",
      projectId: "project-old",
      subject: { kind: "film", id: "project-old" },
      fieldId: "intent",
      proposedEntry: { state: "set", value: "contrast" },
      status: "pending",
      evidenceRefs: ["evidence-old"],
      contextManifestId: "manifest-old",
      source: {},
      dependencyRevision: { structureRevision: 3, analysisRevision: 5 },
      acceptedRecordId: null,
      createdAt: now,
      updatedAt: now,
      revision: 1,
    }],
    analysisEvidence: [{
      id: "evidence-old",
      projectId: "project-old",
      ref: { id: "ref-old", kind: "time-point", mediaIdentityDigest: "digest", atUs: 1_000_000 },
      status: "valid",
      staleReason: null,
      recordId: "record-old",
      candidateId: "candidate-old",
      boundRevision: 3,
      createdAt: now,
      updatedAt: now,
      revision: 1,
    }],
    analysisContextManifests: [{
      id: "manifest-old",
      projectId: "project-old",
      taskKind: "film-analysis",
      subject: { kind: "film", id: "project-old" },
      dependencyRevision: { structureRevision: 3, analysisRevision: 5 },
      promptDefinitionId: "prompt",
      promptDefinitionVersion: 1,
      contextDefinitionId: "context",
      contextDefinitionVersion: 1,
      evidenceRefs: ["evidence-old"],
      includedFieldIds: ["intent"],
      mediaRanges: [{ startFrame: 0, endFrame: 24 }],
      createdAt: now,
    }],
    screenshots: [],
  }

  const archive = encodeBackupArchive(manifest)
  const decoded = decodeBackupArchive(archive, 512 * 1024 * 1024)

  assert.deepEqual(decoded.manifest, manifest)
  assert.equal(decoded.entries.has("manifest.json"), true)
  const decodedManifest = decoded.manifest as typeof manifest
  assert.equal(decodedManifest.analysisContextManifests[0].id, "manifest-old")
  assert.equal(decodedManifest.analysisCandidates[0].contextManifestId, "manifest-old")
})
