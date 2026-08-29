import assert from "node:assert/strict";
import test from "node:test";
import { AutoShotMediaIdentityError, createAutoShotMediaIdentity, digestAutoShotContent } from "../src/features/auto-shot/mediaIdentityService.ts";

test("uses full SHA-256 for files up to 32 MiB", async () => {
  const file = new File([new Uint8Array([1, 2, 3, 4])], "clip.mp4", { type: "video/mp4" });
  const result = await digestAutoShotContent(file);
  assert.equal(result.strategy, "sha256-file-v1");
  assert.equal(result.digest, "9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a");
});

test("uses a fixed 4 MiB chunk manifest for large files", async () => {
  const bytes = new Uint8Array(32 * 1024 * 1024 + 1);
  bytes[0] = 1;
  bytes[bytes.length - 1] = 2;
  const progress: number[] = [];
  const result = await digestAutoShotContent(new File([bytes], "large.mp4"), { onProgress: (done) => progress.push(done) });
  assert.equal(result.strategy, "sha256-chunk-manifest-4m-v1");
  assert.equal(progress.at(-1), bytes.length);
  assert.match(result.digest, /^[0-9a-f]{64}$/);
});

test("rejects empty media and supports cancellation", async () => {
  await assert.rejects(() => digestAutoShotContent(new File([], "empty.mp4")), (error: unknown) => error instanceof AutoShotMediaIdentityError && error.code === "MEDIA_READ_FAILED");
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => digestAutoShotContent(new File([new Uint8Array([1])], "clip.mp4"), { signal: controller.signal }), (error: unknown) => error instanceof AutoShotMediaIdentityError && error.code === "MEDIA_DIGEST_CANCELLED");
});

test("builds identity only from complete metadata", async () => {
  const identity = await createAutoShotMediaIdentity(new File([new Uint8Array([1, 2])], "clip.mp4"), {
    readMetadata: async () => ({ codec: "avc1.640028", codedWidth: 1920, codedHeight: 1080, displayWidth: 1920, displayHeight: 1080, rotation: 0, durationUs: 1_000_000 }),
  });
  assert.equal(identity.size, 2);
  assert.equal(identity.contentDigestStrategy, "sha256-file-v1");
  assert.match(identity.mediaIdentityDigest, /^[0-9a-f]{64}$/);
});
