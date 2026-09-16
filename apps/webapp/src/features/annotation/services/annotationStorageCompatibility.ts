import type { AnnotationMarker } from "../types";

export const annotationMarkerStorageScopes = [
  "free",
  "film",
  "section",
  "sequence",
  "scene",
  "shot",
] as const;

export type AnnotationMarkerStorageScope = (typeof annotationMarkerStorageScopes)[number];

export interface StoredAnnotationMarkerV18 {
  id: string;
  projectId: string;
  frame: number;
  content: string;
  scope: AnnotationMarkerStorageScope;
  createdAt: string;
  updatedAt: string;
}

export type CompatibleAnnotationMarker = AnnotationMarker & {
  /** Retains the v18 scope while the rolled-back UI still uses the v17 shape. */
  storageScope?: AnnotationMarkerStorageScope;
};

const legacyCategoryLabels: Record<AnnotationMarker["category"], string> = {
  important: "重要镜头",
  composition: "构图精妙",
  emotion: "情绪高点",
  "turning-point": "转折点",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`本地标记数据无效：${field} 不能为空。`);
  return value;
}

function requiredFrame(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error("本地标记数据无效：frame 必须是非负安全整数。");
  return value as number;
}

function requiredTimestamp(value: unknown, field: string): string {
  const timestamp = requiredString(value, field);
  if (!Number.isFinite(Date.parse(timestamp))) throw new Error(`本地标记数据无效：${field} 不是有效时间。`);
  return timestamp;
}

function isStorageScope(value: unknown): value is AnnotationMarkerStorageScope {
  return typeof value === "string" && annotationMarkerStorageScopes.includes(value as AnnotationMarkerStorageScope);
}

export function normalizeStoredAnnotationMarker(value: unknown): CompatibleAnnotationMarker {
  if (!isRecord(value)) throw new Error("本地标记数据无效：记录不是对象。");
  const id = requiredString(value.id, "id");
  const projectId = requiredString(value.projectId, "projectId");
  const frame = requiredFrame(value.frame);
  const createdAt = requiredTimestamp(value.createdAt, "createdAt");
  const updatedAt = requiredTimestamp(value.updatedAt, "updatedAt");

  if (
    value.category === "important" ||
    value.category === "composition" ||
    value.category === "emotion" ||
    value.category === "turning-point"
  ) {
    return {
      id,
      projectId,
      frame,
      shotId: typeof value.shotId === "string" ? value.shotId : null,
      category: value.category,
      label: typeof value.label === "string" && value.label.trim() ? value.label : legacyCategoryLabels[value.category],
      note: typeof value.note === "string" ? value.note : "",
      createdAt,
      updatedAt,
    };
  }

  if (typeof value.content === "string" && isStorageScope(value.scope)) {
    const content = value.content.trim();
    const [label = "", ...noteParts] = content.split(/\r?\n/);
    return {
      id,
      projectId,
      frame,
      shotId: null,
      category: "important",
      label: label.trim() || legacyCategoryLabels.important,
      note: noteParts.join("\n").trim(),
      createdAt,
      updatedAt,
      storageScope: value.scope,
    };
  }

  throw new Error("本地标记数据无效：无法识别 v17/v18 标记结构。");
}

export function toStoredAnnotationMarker(marker: AnnotationMarker, projectId = marker.projectId, updatedAt = marker.updatedAt): StoredAnnotationMarkerV18 {
  const compatibleMarker = marker as CompatibleAnnotationMarker;
  const content = [marker.label.trim(), marker.note.trim()].filter(Boolean).join("\n") || legacyCategoryLabels[marker.category];
  const scope = compatibleMarker.storageScope ?? (marker.shotId ? "shot" : "free");
  return {
    id: marker.id,
    projectId,
    frame: marker.frame,
    content,
    scope,
    createdAt: marker.createdAt,
    updatedAt,
  };
}
