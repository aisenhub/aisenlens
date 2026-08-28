import assert from "node:assert/strict";
import test from "node:test";
import { adaptSceneResultToCandidates } from "../src/features/auto-shot/sceneResultAdapter.ts";

function result(boundaries: any[], durationUs = 10_000_000): any {
  return { schemaVersion: 1, engineVersion: "wasm-media-simd", configHash: "fnv1a32-test", media: { durationUs, decodedFrames: 300, codedWidth: 1920, codedHeight: 1080 }, boundaries, diagnostics: { backend: "wasm-simd", elapsedMs: 0, peakWasmBytes: 0 } };
}

function boundary(id: string, timestampUs: number, presentationIndex: number, kind: "hard-cut" | "fade" = "hard-cut"): any {
  return { id, kind, boundary: { timestampUs, presentationIndex, durationUs: 40_000 }, transitionRange: kind === "fade" ? { start: { timestampUs: timestampUs - 200_000, presentationIndex: presentationIndex - 5, durationUs: 40_000 }, end: { timestampUs, presentationIndex, durationUs: 40_000 } } : null, sources: [{ detector: "content", score: 7000, threshold: 2700, strength: null, evidence: { deltaLuma: 100 } }] };
}

test("maps sorted boundaries to deterministic interior frame intervals and tail", () => {
  const output = adaptSceneResultToCandidates({ result: result([boundary("late", 5_000_000, 150), boundary("early", 0, 0), boundary("end", 10_000_000, 300)]), durationUs: 10_000_000, fpsNumerator: 30, fpsDenominator: 1 });
  assert.equal(output.durationFrames, 300);
  assert.deepEqual(output.candidates.map(({ startFrame, endFrame, kind }) => ({ startFrame, endFrame, kind })), [
    { startFrame: 0, endFrame: 1, kind: "hard-cut" },
    { startFrame: 1, endFrame: 150, kind: "hard-cut" },
    { startFrame: 150, endFrame: 299, kind: "hard-cut" },
    { startFrame: 299, endFrame: 300, kind: "tail" },
  ]);
});

test("deduplicates same projected frame using stable timestamp ordinal order and preserves fade evidence", () => {
  const output = adaptSceneResultToCandidates({ result: result([boundary("second", 1_000_000, 8), boundary("first", 1_000_000, 7, "fade")]), durationUs: 4_000_000, fpsNumerator: 24, fpsDenominator: 1 });
  assert.equal(output.candidates.length, 2);
  assert.equal(output.candidates[0].kind, "fade");
  assert.equal(output.candidates[0].score, 7000);
  assert.deepEqual(output.candidates[0].transitionRange?.start, { timestampUs: 800_000, presentationIndex: 2, durationUs: 40_000 });
});

test("zero-duration media produces one legal tail and no interior boundary", () => {
  const output = adaptSceneResultToCandidates({ result: result([boundary("zero", 0, 0)], 0), durationUs: 0, fpsNumerator: 30, fpsDenominator: 1 });
  assert.deepEqual(output.candidates.map(({ startFrame, endFrame, kind }) => ({ startFrame, endFrame, kind })), [{ startFrame: 0, endFrame: 1, kind: "tail" }]);
});

test("rejects invalid timebase and negative timestamps", () => {
  assert.throws(() => adaptSceneResultToCandidates({ result: result([]), durationUs: 1_000, fpsNumerator: 0, fpsDenominator: 1 }), /fps must be positive/);
  assert.throws(() => adaptSceneResultToCandidates({ result: result([boundary("bad", -1, 0)]), durationUs: 1_000, fpsNumerator: 30, fpsDenominator: 1 }), /timestampUs/);
});
