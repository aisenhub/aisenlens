export type CompositionGuideId = "none" | "thirds" | "center" | "diagonal" | "horizontal-thirds" | "vertical-thirds" | "grid" | "golden-ratio";
export type CompositionLineStyle = "solid" | "dashed";
export type CompositionLineWidth = 1 | 2 | 3;
export type CompositionDrawingTool = "select" | "line" | "rectangle" | "ellipse" | "triangle" | "arrow" | "curve";
export type CompositionShapeType = Exclude<CompositionDrawingTool, "select">;

export interface CompositionPoint {
  x: number;
  y: number;
}

export interface CompositionOverlayShape {
  id: string;
  type: CompositionShapeType;
  start: CompositionPoint;
  end: CompositionPoint;
  control?: CompositionPoint;
  rotation?: number;
}

export interface CompositionOverlaySettings {
  enabled: boolean;
  guide: CompositionGuideId;
  showSafeMargins: boolean;
  color: string;
  opacity: number;
  lineStyle: CompositionLineStyle;
  lineWidth: CompositionLineWidth;
  includeInScreenshots: boolean;
  gridRows: number;
  gridColumns: number;
  shapes: CompositionOverlayShape[];
}

export const DEFAULT_COMPOSITION_OVERLAY_SETTINGS: CompositionOverlaySettings = {
  enabled: false,
  guide: "none",
  showSafeMargins: false,
  color: "#ffffff",
  opacity: 0.55,
  lineStyle: "solid",
  lineWidth: 1,
  includeInScreenshots: false,
  gridRows: 3,
  gridColumns: 3,
  shapes: [],
};

export function getCompositionOverlayScreenshotSignature(settings: CompositionOverlaySettings) {
  if (!settings.enabled || !settings.includeInScreenshots) return "none";
  const { enabled: _enabled, includeInScreenshots: _includeInScreenshots, ...renderSettings } = settings;
  return JSON.stringify(renderSettings);
}

function normalizePoint(point?: Partial<CompositionPoint> | null): CompositionPoint {
  return {
    x: Math.max(0, Math.min(100, Number(point?.x) || 0)),
    y: Math.max(0, Math.min(100, Number(point?.y) || 0)),
  };
}

function normalizeShapes(shapes?: CompositionOverlayShape[] | null): CompositionOverlayShape[] {
  if (!Array.isArray(shapes)) return [];
  return shapes.flatMap((shape) => {
    if (!shape || !["line", "rectangle", "ellipse", "triangle", "arrow", "curve"].includes(shape.type) || typeof shape.id !== "string" || !shape.id) return [];
    const rotation = Number(shape.rotation);
    const supportsRotation = shape.type === "rectangle" || shape.type === "ellipse" || shape.type === "triangle";
    return [{ id: shape.id, type: shape.type, start: normalizePoint(shape.start), end: normalizePoint(shape.end), ...(supportsRotation && Number.isFinite(rotation) ? { rotation: ((rotation % 360) + 360) % 360 } : {}), ...(shape.type === "curve" ? { control: normalizePoint(shape.control ?? { x: (Number(shape.start?.x) + Number(shape.end?.x)) / 2, y: (Number(shape.start?.y) + Number(shape.end?.y)) / 2 }) } : {}) }];
  });
}

export function normalizeCompositionOverlaySettings(settings?: Partial<CompositionOverlaySettings> | null): CompositionOverlaySettings {
  const rows = Math.round(settings?.gridRows ?? DEFAULT_COMPOSITION_OVERLAY_SETTINGS.gridRows);
  const columns = Math.round(settings?.gridColumns ?? DEFAULT_COMPOSITION_OVERLAY_SETTINGS.gridColumns);
  const lineWidth = Number(settings?.lineWidth ?? DEFAULT_COMPOSITION_OVERLAY_SETTINGS.lineWidth);
  return {
    ...DEFAULT_COMPOSITION_OVERLAY_SETTINGS,
    ...settings,
    opacity: Math.max(0.15, Math.min(1, settings?.opacity ?? DEFAULT_COMPOSITION_OVERLAY_SETTINGS.opacity)),
    lineWidth: lineWidth >= 3 ? 3 : lineWidth >= 2 ? 2 : 1,
    gridRows: Math.max(1, Math.min(12, rows)),
    gridColumns: Math.max(1, Math.min(12, columns)),
    shapes: normalizeShapes(settings?.shapes),
  };
}
