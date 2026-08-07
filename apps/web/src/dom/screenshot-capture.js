import { drawOverlayOnCanvas } from './overlay-canvas.js';
import { createScreenshotVariants as buildScreenshotVariants } from './screenshot-service.js';

export function createScreenshotCaptureController({
  overlayCanvas,
  getOverlayMode,
  getShapes,
  lineColor,
  lineDash,
  processImage
} = {}) {
  const createVariants = sourceCanvas => buildScreenshotVariants(sourceCanvas, {
    drawOverlay: (context, canvasWidth, canvasHeight) => {
      drawOverlayOnCanvas(context, canvasWidth, canvasHeight, {
        mode: getOverlayMode?.(),
        shapes: getShapes?.() || [],
        overlayWidth: overlayCanvas?.width || canvasWidth,
        overlayHeight: overlayCanvas?.height || canvasHeight,
        lineColor,
        lineDash
      });
    },
    processImage
  });
  return { createVariants };
}
