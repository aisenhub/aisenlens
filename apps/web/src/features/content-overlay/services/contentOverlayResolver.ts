import type { AnalysisFieldValue, TemplateField } from "../../template/types";
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

function formatFieldValue(value: AnalysisFieldValue | undefined): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "boolean") return value ? "是" : "否";
  if (Array.isArray(value)) {
    const formatted = value.map((item) => item.trim()).filter(Boolean).join(" · ");
    return formatted || null;
  }
  return null;
}

export function resolveContentOverlay({ settings, fields, values, description, analysis, shotIndex, currentTimecode, durationSeconds }: { settings: ContentOverlaySettings; fields: TemplateField[]; values: Record<string, AnalysisFieldValue>; description: string; analysis: string; shotIndex: number; currentTimecode: string; durationSeconds: number; }): ContentOverlayViewModel {
  const fieldById = new Map(fields.map((field) => [field.id, field]));
  const items = settings.fieldIds.flatMap((fieldId) => {
    const field = fieldById.get(fieldId);
    const value = formatFieldValue(values[fieldId]);
    return field && value ? [{ id: field.id, label: field.label, value }] : [];
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
