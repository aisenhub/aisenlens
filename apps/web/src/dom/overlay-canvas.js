export function drawOverlayOnCanvas(context, canvasWidth, canvasHeight, {
  mode = 'none',
  shapes = [],
  overlayWidth,
  overlayHeight,
  lineColor = '#ff3b30',
  lineDash = []
} = {}) {
  if (mode === 'none' && shapes.length === 0) return;
  const width = Number(overlayWidth) || 0;
  const height = Number(overlayHeight) || 0;
  if (!width || !height) return;
  const scaleX = canvasWidth / width;
  const scaleY = canvasHeight / height;
  context.save();
  context.scale(scaleX, scaleY);
  context.strokeStyle = lineColor;
  context.lineWidth = 1;
  context.setLineDash(lineDash);
  if (mode === 'thirds') {
    context.beginPath();
    for (let index = 1; index <= 2; index++) {
      context.moveTo(width * index / 3, 0);
      context.lineTo(width * index / 3, height);
      context.moveTo(0, height * index / 3);
      context.lineTo(width, height * index / 3);
    }
    context.stroke();
  } else if (mode === 'cross') {
    context.beginPath();
    context.moveTo(width / 2, 0);
    context.lineTo(width / 2, height);
    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);
    context.stroke();
  } else if (mode === 'hlines') {
    context.beginPath();
    for (let index = 1; index <= 2; index++) {
      context.moveTo(0, height * index / 3);
      context.lineTo(width, height * index / 3);
    }
    context.stroke();
  } else if (mode === 'vlines') {
    context.beginPath();
    for (let index = 1; index <= 2; index++) {
      context.moveTo(width * index / 3, 0);
      context.lineTo(width * index / 3, height);
    }
    context.stroke();
  } else if (mode === 'hline-center') {
    context.beginPath();
    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);
    context.stroke();
  } else if (mode === 'vline-center') {
    context.beginPath();
    context.moveTo(width / 2, 0);
    context.lineTo(width / 2, height);
    context.stroke();
  } else if (mode === 'diagonal') {
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(width, height);
    context.moveTo(width, 0);
    context.lineTo(0, height);
    context.stroke();
  } else if (mode === 'diag-left') {
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(width, height);
    context.stroke();
  } else if (mode === 'diag-right') {
    context.beginPath();
    context.moveTo(width, 0);
    context.lineTo(0, height);
    context.stroke();
  } else if (mode.startsWith('draw-') || shapes.length > 0) {
    context.lineWidth = 2;
    shapes.forEach(shape => {
      context.beginPath();
      const startX = shape.start.x * width;
      const startY = shape.start.y * height;
      const endX = shape.end.x * width;
      const endY = shape.end.y * height;
      switch (shape.type) {
        case 'line':
          context.moveTo(startX, startY);
          context.lineTo(endX, endY);
          break;
        case 'rect':
          context.rect(Math.min(startX, endX), Math.min(startY, endY), Math.abs(endX - startX), Math.abs(endY - startY));
          break;
        case 'circle': {
          const radiusX = Math.abs(endX - startX) / 2;
          const radiusY = Math.abs(endY - startY) / 2;
          context.ellipse((startX + endX) / 2, (startY + endY) / 2, radiusX, radiusY, 0, 0, Math.PI * 2);
          break;
        }
        case 'triangle': {
          const left = Math.min(startX, endX);
          const right = Math.max(startX, endX);
          const top = Math.min(startY, endY);
          const bottom = Math.max(startY, endY);
          const middleX = (left + right) / 2;
          const middleY = (top + bottom) / 2;
          switch ((shape.orient || 0) % 4) {
            case 0: context.moveTo(middleX, top); context.lineTo(right, bottom); context.lineTo(left, bottom); break;
            case 1: context.moveTo(right, middleY); context.lineTo(left, top); context.lineTo(left, bottom); break;
            case 2: context.moveTo(middleX, bottom); context.lineTo(left, top); context.lineTo(right, top); break;
            case 3: context.moveTo(left, middleY); context.lineTo(right, top); context.lineTo(right, bottom); break;
          }
          context.closePath();
          break;
        }
        case 'curve': {
          const controlX = shape.ctrl ? shape.ctrl.x * width : (startX + endX) / 2;
          const controlY = shape.ctrl ? shape.ctrl.y * height : (startY + endY) / 2;
          context.moveTo(startX, startY);
          context.quadraticCurveTo(controlX, controlY, endX, endY);
          break;
        }
        case 'scurve': {
          const control1X = shape.ctrl1 ? shape.ctrl1.x * width : startX + (endX - startX) / 3;
          const control1Y = shape.ctrl1 ? shape.ctrl1.y * height : startY - (endY - startY) * 0.3;
          const control2X = shape.ctrl2 ? shape.ctrl2.x * width : startX + (endX - startX) * 2 / 3;
          const control2Y = shape.ctrl2 ? shape.ctrl2.y * height : startY + (endY - startY) * 0.3;
          context.moveTo(startX, startY);
          context.bezierCurveTo(control1X, control1Y, control2X, control2Y, endX, endY);
          break;
        }
      }
      context.stroke();
    });
  }
  context.restore();
}
