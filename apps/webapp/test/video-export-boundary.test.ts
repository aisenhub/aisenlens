import assert from "node:assert/strict";
import { test } from "node:test";
import { selectVideoExportOverlaySegment } from "../src/features/export/services/videoExportBoundary.ts";

test("video export treats shot endFrame as an exclusive boundary", () => {
  const first = { startFrame: 0, endFrame: 30, contentOverlay: null };
  const second = { startFrame: 30, endFrame: 60, contentOverlay: null };
  assert.equal(selectVideoExportOverlaySegment([first, second], 29), first);
  assert.equal(selectVideoExportOverlaySegment([first, second], 30), second);
  assert.equal(selectVideoExportOverlaySegment([first, second], 59), second);
  assert.equal(selectVideoExportOverlaySegment([first, second], 60), null);
});
