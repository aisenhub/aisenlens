import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeAutoShotMediaIdentity, sameAutoShotMediaIdentity, type AutoShotMediaIdentity } from "../src/features/auto-shot/mediaIdentity.ts";

const base: AutoShotMediaIdentity = {
  identitySchema: "aisenlens-auto-shot-media-identity",
  schemaVersion: 1,
  contentDigestStrategy: "sha256-file-v1",
  contentDigest: "a".repeat(64),
  size: 128,
  codec: "avc1.640028",
  codedWidth: 1920,
  codedHeight: 1080,
  displayWidth: 1920,
  displayHeight: 1080,
  rotation: 0,
  durationUs: 4_000_000,
  mediaIdentityDigest: "b".repeat(64),
};

test("media identity canonical form excludes filename, mime and modification time", () => {
  const text = canonicalizeAutoShotMediaIdentity(base);
  assert.match(text, /^\["aisenlens-auto-shot-media-identity",1,128,/);
  assert.equal(text.includes("clip.mov"), false);
  assert.equal(text.includes("video/quicktime"), false);
});

test("media identity comparison includes bytes and track metadata", () => {
  assert.equal(sameAutoShotMediaIdentity(base, { ...base, mediaIdentityDigest: "c".repeat(64) }), false);
  assert.equal(sameAutoShotMediaIdentity(base, { ...base, displayWidth: 1080, displayHeight: 1920 }), false);
  assert.equal(sameAutoShotMediaIdentity(base, { ...base }), true);
});
