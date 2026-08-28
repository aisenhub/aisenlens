import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMediaSourceFingerprint } from "../src/features/project/services/mediaService.ts";

test("normalizes empty browser MIME types from the video extension", () => {
  const fingerprint = normalizeMediaSourceFingerprint({
    name: "sample.mov",
    size: 10,
    lastModified: 1,
    mimeType: "",
  });

  assert.equal(fingerprint.mimeType, "video/quicktime");
});

test("preserves an explicit MIME type", () => {
  const fingerprint = normalizeMediaSourceFingerprint({
    name: "sample.mov",
    size: 10,
    lastModified: 1,
    mimeType: "video/custom",
  });

  assert.equal(fingerprint.mimeType, "video/custom");
});
