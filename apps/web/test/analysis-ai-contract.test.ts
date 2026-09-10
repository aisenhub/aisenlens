import assert from "node:assert/strict"
import test from "node:test"
import { acceptAICandidate, evaluateAICandidate } from "../src/features/analysis/ai/candidateDecision.ts"
import { analysisEntriesEqual } from "../src/features/analysis/services/analysisFieldCommands.ts"
import { createSystemProfileSnapshot } from "../src/features/template/services/fieldRegistry.ts"
import type { AICandidate } from "../src/features/analysis/ai/types.ts"

function candidate(overrides: Partial<AICandidate> = {}): AICandidate {
  return {
    id: "candidate-1",
    projectId: "project-1",
    subject: { kind: "shot", id: "shot-1", mediaIdentityDigest: "media-1", startUs: 0, endUs: 1_000_000 },
    fieldId: "shot",
    definitionVersion: 1,
    profileVersion: 1,
    baseEntry: null,
    proposedEntry: { state: "set", value: "shot.medium" },
    reviewStatus: "pending",
    confidence: null,
    evidence: [],
    source: { runId: "run-1", recipeVersion: "recipe-1" },
    ...overrides,
  }
}

function context(currentEntry?: AICandidate["baseEntry"]) {
  return {
    projectId: "project-1",
    mediaIdentityDigest: "media-1",
    profile: createSystemProfileSnapshot("project-1"),
    shot: { id: "shot-1", startUs: 0, endUs: 1_000_000 },
    currentEntry,
  }
}

test("multi-select comparison is set-based and keeps false/zero meaningful", () => {
  assert.equal(analysisEntriesEqual({ state: "set", value: ["a", "b"] }, { state: "set", value: ["b", "a"] }), true)
  assert.equal(analysisEntriesEqual({ state: "set", value: false }, { state: "set", value: false }), true)
  assert.equal(analysisEntriesEqual({ state: "set", value: 0 }, { state: "set", value: 0 }), true)
})

test("accept validates the current baseline and calls the field command once", () => {
  const current = context()
  let calls = 0
  const result = acceptAICandidate(candidate(), current, () => { calls += 1; return { values: { shot: { state: "set", value: "shot.medium" } }, changed: true, error: null } })
  assert.equal(result.status, "accepted")
  assert.equal(result.applied, true)
  assert.equal(calls, 1)
  const repeat = acceptAICandidate(candidate({ reviewStatus: "accepted" }), current, () => { calls += 1; return { values: {}, changed: true, error: null } })
  assert.equal(repeat.status, "already-accepted")
  assert.equal(calls, 1)
})

test("manual changes make a candidate conflict and never invoke the writer", () => {
  const current = context({ state: "set", value: "shot.wide" })
  const evaluation = evaluateAICandidate(candidate(), current)
  assert.equal(evaluation.conflict, true)
  assert.equal(evaluation.valid, false)
  const result = acceptAICandidate(candidate(), current, () => { throw new Error("writer must not run") })
  assert.equal(result.status, "conflict")
})

test("invalid confidence and changed media are stale or invalid without conversion", () => {
  const result = evaluateAICandidate(candidate({ confidence: 2, subject: { kind: "shot", id: "shot-1", mediaIdentityDigest: "other-media", startUs: 0, endUs: 1_000_000 } }), context())
  assert.equal(result.valid, false)
  assert.equal(result.stale, true)
  assert.ok(result.reasons.some((reason) => reason.includes("媒体身份")))
})
