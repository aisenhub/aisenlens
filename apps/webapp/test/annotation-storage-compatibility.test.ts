import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeStoredAnnotationMarker,
  toStoredAnnotationMarker,
} from "../src/features/annotation/services/annotationStorageCompatibility.ts";

const timestamps = {
  createdAt: "2026-09-16T00:00:00.000Z",
  updatedAt: "2026-09-16T00:01:00.000Z",
};

test("normalizes v17 annotation markers for the rolled-back UI", () => {
  const marker = normalizeStoredAnnotationMarker({
    id: "legacy-marker",
    projectId: "project-1",
    frame: 24,
    shotId: "shot-1",
    category: "emotion",
    label: "情绪高点",
    note: "旧格式仍可读取",
    ...timestamps,
  });

  assert.deepEqual(marker, {
    id: "legacy-marker",
    projectId: "project-1",
    frame: 24,
    shotId: "shot-1",
    category: "emotion",
    label: "情绪高点",
    note: "旧格式仍可读取",
    ...timestamps,
  });
});

test("normalizes v18 annotation markers and preserves their storage scope on write", () => {
  const marker = normalizeStoredAnnotationMarker({
    id: "modern-marker",
    projectId: "project-1",
    frame: 48,
    content: "声音变化\n进入段落后出现音桥",
    scope: "scene",
    ...timestamps,
  });

  assert.equal(marker.label, "声音变化");
  assert.equal(marker.note, "进入段落后出现音桥");
  assert.equal(marker.storageScope, "scene");
  assert.deepEqual(toStoredAnnotationMarker(marker), {
    id: "modern-marker",
    projectId: "project-1",
    frame: 48,
    content: "声音变化\n进入段落后出现音桥",
    scope: "scene",
    ...timestamps,
  });
});

test("writes newly created legacy markers in the v18 storage shape", () => {
  assert.deepEqual(toStoredAnnotationMarker({
    id: "new-marker",
    projectId: "project-1",
    frame: 72,
    shotId: "shot-2",
    category: "composition",
    label: "构图精妙",
    note: "",
    ...timestamps,
  }), {
    id: "new-marker",
    projectId: "project-1",
    frame: 72,
    content: "构图精妙",
    scope: "shot",
    ...timestamps,
  });
});
