import { drawCompositionOverlayOnCanvas, type OverlayCanvasContext } from "../../composition-overlay/services/compositionOverlayCanvas";
import type { CompositionOverlaySettings } from "../../composition-overlay/types";
import type { ContentOverlayViewModel } from "../../content-overlay/services/contentOverlayResolver";
import type { ContentOverlayLayout, ContentOverlaySettings } from "../../content-overlay/types";

export interface VideoOverlayFrame {
  frame: number;
  width: number;
  height: number;
  compositionOverlay?: CompositionOverlaySettings | null;
  contentOverlay?: {
    settings: ContentOverlaySettings;
    model: ContentOverlayViewModel;
  } | null;
}

interface ContentLine {
  text: string;
  color: string;
  font: string;
  lineHeight: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function truncateText(context: OverlayCanvasContext, value: string, maximumWidth: number): string {
  if (context.measureText(value).width <= maximumWidth) return value;
  const suffix = "…";
  let end = value.length;
  while (end > 0 && context.measureText(`${value.slice(0, end)}${suffix}`).width > maximumWidth) end -= 1;
  return `${value.slice(0, end)}${suffix}`;
}

function wrapText(context: OverlayCanvasContext, value: string, maximumWidth: number, maximumLines: number): string[] {
  const lines: string[] = [];
  let line = "";
  const characters = Array.from(value);
  for (const [index, character] of characters.entries()) {
    const next = `${line}${character}`;
    if (line && context.measureText(next).width > maximumWidth) {
      if (lines.length === maximumLines - 1) return [...lines, truncateText(context, `${line}${characters.slice(index).join("")}`, maximumWidth)];
      lines.push(line);
      line = character;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maximumLines) lines.push(line);
  return lines;
}

function roundedRect(context: OverlayCanvasContext, x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function hasContent(model: ContentOverlayViewModel): boolean {
  return Boolean(model.shotNumber || model.timecode || model.duration || model.description || model.analysis || model.items.length);
}

function renderContentLines(context: OverlayCanvasContext, model: ContentOverlayViewModel, maximumWidth: number, scale: number): ContentLine[] {
  const headingSize = Math.round(13 * scale);
  const bodySize = Math.round(12 * scale);
  const microSize = Math.round(10 * scale);
  const mono = `600 ${headingSize}px "JetBrains Mono", monospace`;
  const body = `500 ${bodySize}px Inter, "Microsoft YaHei", sans-serif`;
  const micro = `500 ${microSize}px Inter, "Microsoft YaHei", sans-serif`;
  const lines: ContentLine[] = [];
  const header = [model.shotNumber, model.timecode, model.duration].filter((item): item is string => Boolean(item)).join("  ·  ");
  if (header) {
    context.font = mono;
    lines.push({ text: truncateText(context, header, maximumWidth), color: "#dbeafe", font: mono, lineHeight: Math.round(20 * scale) });
  }
  for (const item of model.items) {
    context.font = body;
    lines.push({ text: truncateText(context, `${item.label}  ${item.value}`, maximumWidth), color: "rgba(255,255,255,0.92)", font: body, lineHeight: Math.round(18 * scale) });
  }
  for (const [label, value, color] of [["画面", model.description, "rgba(255,255,255,0.82)"], ["分析", model.analysis, "rgba(255,255,255,0.72)"]] as const) {
    if (!value) continue;
    context.font = micro;
    wrapText(context, `${label}：${value}`, maximumWidth, 2).forEach((text) => lines.push({ text, color, font: micro, lineHeight: Math.round(16 * scale) }));
  }
  return lines;
}

function contentBounds(layout: ContentOverlayLayout, width: number, height: number, contentHeight: number, gutter: number): { x: number; y: number; width: number; height: number } {
  const panelWidth = layout === "sidebar" ? width * 0.32 : layout === "lower-third" ? width * 0.56 : width * 0.42;
  const panelHeight = layout === "sidebar" ? height - gutter * 2 : contentHeight;
  return {
    x: gutter,
    y: layout === "lower-third" ? height - gutter - panelHeight : gutter,
    width: Math.max(1, panelWidth),
    height: Math.max(1, panelHeight),
  };
}

export function renderContentOverlayCanvas(context: OverlayCanvasContext, frame: VideoOverlayFrame): void {
  const contentOverlay = frame.contentOverlay;
  if (!contentOverlay?.settings.enabled || !hasContent(contentOverlay.model)) return;
  const scale = clamp(Math.min(frame.width / 1280, frame.height / 720), 0.8, 2);
  const gutter = Math.round(12 * scale);
  const padding = Math.round(10 * scale);
  const layout = contentOverlay.settings.layout;
  const approximateWidth = contentBounds(layout, frame.width, frame.height, 1, gutter).width - padding * 2;
  const lines = renderContentLines(context, contentOverlay.model, approximateWidth, scale);
  const contentHeight = lines.reduce((total, line) => total + line.lineHeight, 0) + padding * 2;
  const bounds = contentBounds(layout, frame.width, frame.height, contentHeight, gutter);

  context.save();
  if (contentOverlay.settings.showBackground) {
    roundedRect(context, bounds.x, bounds.y, bounds.width, bounds.height, Math.round(8 * scale));
    context.fillStyle = `rgba(0, 0, 0, ${contentOverlay.settings.backgroundOpacity})`;
    context.fill();
    context.strokeStyle = "rgba(255, 255, 255, 0.15)";
    context.lineWidth = Math.max(1, scale);
    context.stroke();
  }

  let y = bounds.y + padding;
  for (const line of lines) {
    context.font = line.font;
    context.fillStyle = line.color;
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(line.text, bounds.x + padding, y);
    y += line.lineHeight;
  }
  context.restore();
}

export function renderCompositionOverlayCanvas(context: OverlayCanvasContext, frame: VideoOverlayFrame): void {
  if (frame.compositionOverlay?.enabled) drawCompositionOverlayOnCanvas(context, frame.width, frame.height, frame.compositionOverlay);
}

export function renderVideoOverlayCanvas(context: OverlayCanvasContext, frame: VideoOverlayFrame): void {
  renderContentOverlayCanvas(context, frame);
  renderCompositionOverlayCanvas(context, frame);
}
