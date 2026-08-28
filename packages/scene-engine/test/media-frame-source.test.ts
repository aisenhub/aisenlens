import assert from "node:assert/strict";
import test from "node:test";
import { MediaFrameSource } from "../src/worker/mediaFrameSource.js";
import type { MediaDecoder } from "../src/worker/mediaDecoder.js";
import type { SceneEngineCheckpoint } from "../src/api/types.js";

test("media frame source forwards checkpoint and target to the decoder and disposes it", async () => {
  let forwardedCheckpoint: unknown;
  let forwardedTarget: unknown;
  let disposed = false;
  const decoder: MediaDecoder = {
    durationUs: 2_000,
    codedWidth: 2,
    codedHeight: 2,
    pixelFormat: 2,
    stats: { openedSamples: 0, closedSamples: 0, submittedFrames: 0, skippedFrames: 0 },
    async *frames(checkpoint, target) {
      forwardedCheckpoint = checkpoint;
      forwardedTarget = target;
      yield {
        pixelFormat: 2,
        bitDepth: 8,
        fullRange: true,
        codedWidth: 2,
        codedHeight: 2,
        visibleX: 0,
        visibleY: 0,
        visibleWidth: 2,
        visibleHeight: 2,
        matrix: 2,
        primaries: 2,
        transfer: 2,
        presentationIndex: 1,
        timestampUs: 1_000,
        durationUs: 1_000,
        planes: [{ data: new Uint8Array(16), strideBytes: 8, sizeBytes: 16 }],
      };
    },
    dispose() { disposed = true; },
  };
  const checkpoint = { schemaVersion: 1, engineVersion: "test", configHash: "fnv1a32-00000000", mediaFingerprint: "sha256:test", resumeAfter: { timestampUs: 500, timestampOrdinal: 0, nextPresentationIndex: 1 }, committedBoundaries: [], coreState: new ArrayBuffer(0) } satisfies SceneEngineCheckpoint;
  const source = new MediaFrameSource(decoder, checkpoint);
  const target = {} as never;
  const frames = [];
  for await (const frame of source.frames(target)) frames.push(frame);
  assert.equal(frames.length, 1);
  assert.deepEqual(forwardedCheckpoint, checkpoint.resumeAfter);
  assert.equal(forwardedTarget, target);
  source.dispose();
  assert.equal(disposed, true);
});
