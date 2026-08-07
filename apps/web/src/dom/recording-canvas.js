export function drawWrappedText(context, value, x, y, width, maxLines, lineHeight) {
  const text = String(value || '—');
  const lines = [];
  let currentLine = '';
  for (const character of text) {
    const candidate = currentLine + character;
    if (currentLine && context.measureText(candidate).width > width) {
      lines.push(currentLine);
      currentLine = character;
    } else {
      currentLine = candidate;
    }
  }
  if (currentLine || !lines.length) lines.push(currentLine || '—');
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let lastLine = lines[maxLines - 1];
    while (lastLine.length > 1 && context.measureText(`${lastLine}…`).width > width) lastLine = lastLine.slice(0, -1);
    lines[maxLines - 1] = `${lastLine}…`;
  }
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => context.fillText(line, x, startY + index * lineHeight));
}

export function drawImageContain(context, image, x, y, width, height) {
  if (!image) return;
  const sourceWidth = image.videoWidth || image.naturalWidth;
  const sourceHeight = image.videoHeight || image.naturalHeight;
  if (!sourceWidth || !sourceHeight || (typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement && !image.complete)) return;
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

export function drawRoundedPath(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}
