import {
  annotationMarkerScopes,
  type AnnotationMarker,
  type LegacyAnnotationMarkerV17,
} from "../types.ts";

const legacyCategoryLabels: Record<LegacyAnnotationMarkerV17["category"], string> = {
  important: "重要镜头",
  composition: "构图精妙",
  emotion: "情绪高点",
  "turning-point": "转折点",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`标记迁移失败：${field} 无效。`);
  }
  return value;
}

function requiredFrame(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error("标记迁移失败：frame 必须是非负安全整数。");
  }
  return value as number;
}

function requiredTimestamp(value: unknown, field: string): string {
  const timestamp = requiredString(value, field);
  if (!Number.isFinite(Date.parse(timestamp))) {
    throw new Error(`标记迁移失败：${field} 不是有效时间。`);
  }
  return timestamp;
}

export function migrateLegacyAnnotationMarker(value: unknown): AnnotationMarker {
  if (!isRecord(value)) throw new Error("标记迁移失败：记录不是对象。");
  const category = value.category;
  if (
    category !== "important" &&
    category !== "composition" &&
    category !== "emotion" &&
    category !== "turning-point"
  ) {
    throw new Error("标记迁移失败：旧 category 无效。");
  }
  const label = typeof value.label === "string" ? value.label.trim() : "";
  const note = typeof value.note === "string" ? value.note.trim() : "";
  const content = [label, note].filter(Boolean).join("\n") || legacyCategoryLabels[category];
  return {
    id: requiredString(value.id, "id"),
    projectId: requiredString(value.projectId, "projectId"),
    frame: requiredFrame(value.frame),
    content,
    scope: "free",
    createdAt: requiredTimestamp(value.createdAt, "createdAt"),
    updatedAt: requiredTimestamp(value.updatedAt, "updatedAt"),
  };
}

export function assertAnnotationMarker(value: unknown): asserts value is AnnotationMarker {
  if (!isRecord(value)) throw new Error("备份包含无效的标记记录。");
  requiredString(value.id, "id");
  requiredString(value.projectId, "projectId");
  requiredFrame(value.frame);
  if (typeof value.content !== "string" || !value.content.trim()) {
    throw new Error("备份包含空白标记内容。");
  }
  if (!annotationMarkerScopes.includes(value.scope as AnnotationMarker["scope"])) {
    throw new Error("备份包含无效的标记观察尺度。");
  }
  requiredTimestamp(value.createdAt, "createdAt");
  requiredTimestamp(value.updatedAt, "updatedAt");
}
