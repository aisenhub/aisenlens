import type { AnalysisFieldEntry, ResolvedAnalysisField } from "../../template/types";
import type { ContentOverlaySettings } from "../types";

export interface ContentOverlayItem {
  id: string;
  label: string;
  value: string;
}

export interface ContentOverlayViewModel {
  shotNumber: string | null;
  timecode: string | null;
  duration: string | null;
  description: string | null;
  analysis: string | null;
  items: ContentOverlayItem[];
}

function formatFieldValue(field: ResolvedAnalysisField, entry: AnalysisFieldEntry | undefined): string | null {
  if (!entry || entry.state === "unknown") return entry?.state === "unknown" ? "待判断" : null;
  if (entry.state === "not_applicable") return "不适用";
  const value = entry.value;
  if (field.definition.kind === "single-select" && typeof value === "string") return field.definition.options.find((option) => option.id === value)?.label ?? "已停用选项";
  if (field.definition.kind === "multi-select" && Array.isArray(value)) return value.map((item) => field.definition.options.find((option) => option.id === item)?.label ?? "已停用选项").join(" · ") || null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "boolean") return value ? "是" : "否";
  if (Array.isArray(value)) {
    const formatted = value.map((item) => item.trim()).filter(Boolean).join(" · ");
    return formatted || null;
  }
  return null;
}

export function resolveContentOverlay({ settings, fields, values, description, analysis, shotIndex, currentTimecode, durationSeconds }: { settings: ContentOverlaySettings; fields: ResolvedAnalysisField[]; values: Record<string, AnalysisFieldEntry>; description: string; analysis: string; shotIndex: number; currentTimecode: string; durationSeconds: number; }): ContentOverlayViewModel {
  const fieldById = new Map(fields.map((field) => [field.definition.fieldId, field]));
  const items = settings.fieldIds.flatMap((fieldId) => {
    const field = fieldById.get(fieldId);
    const value = field ? formatFieldValue(field, values[fieldId]) : null;
    return field && value ? [{ id: field.definition.fieldId, label: field.definition.label, value }] : [];
  });
  const normalizedDescription = description.trim();
  const normalizedAnalysis = analysis.trim();
  return {
    shotNumber: settings.showShotNumber ? `SHOT ${String(shotIndex + 1).padStart(2, "0")}` : null,
    timecode: settings.showTimecode ? currentTimecode : null,
    duration: settings.showDuration ? `${Math.round(Math.max(0, durationSeconds) * 10) / 10} 秒` : null,
    description: settings.showDescription && normalizedDescription ? normalizedDescription : null,
    analysis: settings.showAnalysis && normalizedAnalysis ? normalizedAnalysis : null,
    items,
  };
}
