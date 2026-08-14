export type ContentOverlayLayout = "compact" | "sidebar" | "lower-third";

export interface ContentOverlaySettings {
  enabled: boolean;
  layout: ContentOverlayLayout;
  fieldIds: string[];
  showShotNumber: boolean;
  showTimecode: boolean;
  showDuration: boolean;
  showDescription: boolean;
  showAnalysis: boolean;
  showBackground: boolean;
  backgroundOpacity: number;
}

export const DEFAULT_CONTENT_OVERLAY_SETTINGS: ContentOverlaySettings = {
  enabled: false,
  layout: "compact",
  fieldIds: [],
  showShotNumber: true,
  showTimecode: true,
  showDuration: false,
  showDescription: false,
  showAnalysis: false,
  showBackground: true,
  backgroundOpacity: 0.15,
};

export function normalizeContentOverlaySettings(settings?: Partial<ContentOverlaySettings> | null): ContentOverlaySettings {
  const layout = settings?.layout;
  const fieldIds = Array.isArray(settings?.fieldIds) ? settings.fieldIds : [];
  return {
    ...DEFAULT_CONTENT_OVERLAY_SETTINGS,
    ...settings,
    layout: layout === "sidebar" || layout === "lower-third" ? layout : "compact",
    fieldIds: [...new Set(fieldIds.filter((fieldId): fieldId is string => typeof fieldId === "string" && fieldId.trim().length > 0))].slice(0, 6),
    enabled: Boolean(settings?.enabled),
    showShotNumber: settings?.showShotNumber !== false,
    showTimecode: settings?.showTimecode !== false,
    showDuration: Boolean(settings?.showDuration),
    showDescription: Boolean(settings?.showDescription),
    showAnalysis: Boolean(settings?.showAnalysis),
    showBackground: settings?.showBackground !== false,
    backgroundOpacity: Math.max(0.05, Math.min(0.75, Number(settings?.backgroundOpacity) || DEFAULT_CONTENT_OVERLAY_SETTINGS.backgroundOpacity)),
  };
}
