function pointToLine(px, py, x1, y1, x2, y2, distance) {
  const firstX = px - x1;
  const firstY = py - y1;
  const secondX = x2 - x1;
  const secondY = y2 - y1;
  const dot = firstX * secondX + firstY * secondY;
  const lengthSquared = secondX * secondX + secondY * secondY;
  const ratio = lengthSquared ? Math.max(0, Math.min(1, dot / lengthSquared)) : 0;
  return Math.hypot(px - (x1 + ratio * secondX), py - (y1 + ratio * secondY)) < distance;
}

export function hitTestOverlayShape(shape, x, y, margin = 0.015) {
  if (!shape) return false;
  const { type, start, end } = shape;
  if (!start || !end) return false;
  if (type === 'line') return pointToLine(x, y, start.x, start.y, end.x, end.y, margin * 2);
  if (type === 'rect' || type === 'triangle') {
    const minX = Math.min(start.x, end.x) - margin;
    const maxX = Math.max(start.x, end.x) + margin;
    const minY = Math.min(start.y, end.y) - margin;
    const maxY = Math.max(start.y, end.y) + margin;
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }
  if (type === 'circle') {
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const radiusX = Math.abs(end.x - start.x) / 2 + margin;
    const radiusY = Math.abs(end.y - start.y) / 2 + margin;
    if (!radiusX || !radiusY) return false;
    return ((x - centerX) ** 2) / radiusX ** 2 + ((y - centerY) ** 2) / radiusY ** 2 < 1;
  }
  if (type === 'curve') {
    const controlX = shape.ctrl ? shape.ctrl.x : (start.x + end.x) / 2;
    const controlY = shape.ctrl ? shape.ctrl.y : (start.y + end.y) / 2;
    for (let ratio = 0; ratio <= 1; ratio += 0.02) {
      const inverse = 1 - ratio;
      const curveX = inverse ** 2 * start.x + 2 * inverse * ratio * controlX + ratio ** 2 * end.x;
      const curveY = inverse ** 2 * start.y + 2 * inverse * ratio * controlY + ratio ** 2 * end.y;
      if (Math.hypot(x - curveX, y - curveY) < margin * 1.5) return true;
    }
    return false;
  }
  if (type === 'scurve') {
    const control1X = shape.ctrl1 ? shape.ctrl1.x : start.x + (end.x - start.x) / 3;
    const control1Y = shape.ctrl1 ? shape.ctrl1.y : start.y + (end.y - start.y) / 3;
    const control2X = shape.ctrl2 ? shape.ctrl2.x : start.x + (end.x - start.x) * 2 / 3;
    const control2Y = shape.ctrl2 ? shape.ctrl2.y : start.y + (end.y - start.y) * 2 / 3;
    for (let ratio = 0; ratio <= 1; ratio += 0.02) {
      const inverse = 1 - ratio;
      const curveX = inverse ** 3 * start.x
        + 3 * inverse ** 2 * ratio * control1X
        + 3 * inverse * ratio ** 2 * control2X
        + ratio ** 3 * end.x;
      const curveY = inverse ** 3 * start.y
        + 3 * inverse ** 2 * ratio * control1Y
        + 3 * inverse * ratio ** 2 * control2Y
        + ratio ** 3 * end.y;
      if (Math.hypot(x - curveX, y - curveY) < margin * 1.5) return true;
    }
  }
  return false;
}

export function getOverlayHandleAtPosition(shape, x, y, { width = 1, height = 1, margin = 0.018 } = {}) {
  if (!shape || !shape.start || !shape.end) return '';
  const radius = 8 / Math.max(width, height) * 2.5;
  if (shape.type === 'curve' && shape.ctrl && Math.hypot(x - shape.ctrl.x, y - shape.ctrl.y) < radius) return 'ctrl';
  if (shape.type === 'scurve' && shape.ctrl1 && Math.hypot(x - shape.ctrl1.x, y - shape.ctrl1.y) < radius) return 'ctrl1';
  if (shape.type === 'scurve' && shape.ctrl2 && Math.hypot(x - shape.ctrl2.x, y - shape.ctrl2.y) < radius) return 'ctrl2';
  if (Math.hypot(x - shape.start.x, y - shape.start.y) < radius) return 'start';
  if (Math.hypot(x - shape.end.x, y - shape.end.y) < radius) return 'end';
  if (shape.type !== 'line') {
    const centerX = (shape.start.x + shape.end.x) / 2;
    const centerY = (shape.start.y + shape.end.y) / 2;
    if (Math.hypot(x - centerX, y - centerY) < radius) return 'center';
  }
  return hitTestOverlayShape(shape, x, y, margin) ? 'center' : '';
}

export function cloneOverlayShape(shape) {
  return shape ? JSON.parse(JSON.stringify(shape)) : shape;
}
