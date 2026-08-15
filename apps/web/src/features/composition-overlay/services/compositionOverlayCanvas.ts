import type { CompositionOverlaySettings, CompositionOverlayShape } from "../types";

export type OverlayCanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function drawLine(context: OverlayCanvasContext, startX: number, startY: number, endX: number, endY: number) {
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
}

function drawShape(context: OverlayCanvasContext, shape: CompositionOverlayShape, width: number, height: number) {
  const startX = (shape.start.x / 100) * width;
  const startY = (shape.start.y / 100) * height;
  const endX = (shape.end.x / 100) * width;
  const endY = (shape.end.y / 100) * height;
  const supportsRotation = shape.type === "rectangle" || shape.type === "ellipse" || shape.type === "triangle";
  const rotation = supportsRotation ? shape.rotation ?? 0 : 0;
  if (rotation) {
    context.save();
    context.translate((startX + endX) / 2, (startY + endY) / 2);
    context.rotate((rotation * Math.PI) / 180);
    context.translate(-(startX + endX) / 2, -(startY + endY) / 2);
  }
  context.beginPath();
  if (shape.type === "line" || shape.type === "arrow") drawLine(context, startX, startY, endX, endY);
  if (shape.type === "rectangle") context.rect(Math.min(startX, endX), Math.min(startY, endY), Math.abs(endX - startX), Math.abs(endY - startY));
  if (shape.type === "ellipse") context.ellipse((startX + endX) / 2, (startY + endY) / 2, Math.abs(endX - startX) / 2, Math.abs(endY - startY) / 2, 0, 0, Math.PI * 2);
  if (shape.type === "triangle") {
    const left = Math.min(startX, endX);
    const right = Math.max(startX, endX);
    const top = Math.min(startY, endY);
    const bottom = Math.max(startY, endY);
    context.moveTo((left + right) / 2, top);
    context.lineTo(right, bottom);
    context.lineTo(left, bottom);
    context.closePath();
  }
  if (shape.type === "curve") {
    const control = shape.control ?? { x: (shape.start.x + shape.end.x) / 2, y: (shape.start.y + shape.end.y) / 2 };
    context.moveTo(startX, startY);
    context.quadraticCurveTo((control.x / 100) * width, (control.y / 100) * height, endX, endY);
  }
  context.stroke();
  if (shape.type === "arrow") {
    const angle = Math.atan2(endY - startY, endX - startX);
    const headLength = Math.max(8, context.lineWidth * 4);
    context.save();
    context.setLineDash([]);
    context.beginPath();
    drawLine(context, endX, endY, endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
    drawLine(context, endX, endY, endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
    context.stroke();
    context.restore();
  }
  if (rotation) context.restore();
}

export function drawCompositionOverlayOnCanvas(context: OverlayCanvasContext, width: number, height: number, settings: CompositionOverlaySettings) {
  if (!settings.enabled || (settings.guide === "none" && !settings.showSafeMargins && settings.shapes.length === 0)) return;
  context.save();
  context.strokeStyle = settings.color;
  context.globalAlpha = settings.opacity;
  context.lineWidth = settings.lineWidth;
  context.setLineDash(settings.lineStyle === "dashed" ? [6, 4] : []);
  context.beginPath();
  const addVertical = (percent: number) => drawLine(context, (percent / 100) * width, 0, (percent / 100) * width, height);
  const addHorizontal = (percent: number) => drawLine(context, 0, (percent / 100) * height, width, (percent / 100) * height);
  if (settings.guide === "thirds") [100 / 3, 200 / 3].forEach((percent) => { addVertical(percent); addHorizontal(percent); });
  if (settings.guide === "center") { addVertical(50); addHorizontal(50); }
  if (settings.guide === "diagonal") { drawLine(context, 0, 0, width, height); drawLine(context, width, 0, 0, height); }
  if (settings.guide === "horizontal-thirds") [100 / 3, 200 / 3].forEach(addHorizontal);
  if (settings.guide === "vertical-thirds") [100 / 3, 200 / 3].forEach(addVertical);
  if (settings.guide === "golden-ratio") [38.2, 61.8].forEach((percent) => { addVertical(percent); addHorizontal(percent); });
  if (settings.guide === "grid") {
    Array.from({ length: settings.gridColumns - 1 }, (_, index) => ((index + 1) / settings.gridColumns) * 100).forEach(addVertical);
    Array.from({ length: settings.gridRows - 1 }, (_, index) => ((index + 1) / settings.gridRows) * 100).forEach(addHorizontal);
  }
  context.stroke();
  if (settings.showSafeMargins) {
    context.save();
    context.globalAlpha = Math.min(1, settings.opacity + 0.1);
    context.setLineDash([6, 4]);
    context.strokeRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9);
    context.restore();
    context.setLineDash([]);
    context.strokeRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);
  }
  settings.shapes.forEach((shape) => drawShape(context, shape, width, height));
  context.restore();
}
