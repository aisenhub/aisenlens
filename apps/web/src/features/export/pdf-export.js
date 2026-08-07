export function getPdfExportLayout({ pageWidth = 297, pageHeight = 210, margin = 8 } = {}) {
  return {
    pageWidth,
    pageHeight,
    margin,
    maxWidth: pageWidth - margin * 2,
    maxHeight: pageHeight - margin * 2
  };
}

export function getPdfExportChunk(items = [], startIndex = 0, chunkSize = 10) {
  const start = Math.max(0, Number(startIndex) || 0);
  const size = Math.max(1, Number(chunkSize) || 1);
  return items.slice(start, start + size);
}

export function getPdfImageHeight(canvasWidth, canvasHeight, maxWidth, maxHeight) {
  const imageHeight = Number(maxWidth) * Number(canvasHeight) / Math.max(1, Number(canvasWidth) || 0);
  return Math.min(Number(maxHeight), imageHeight);
}
