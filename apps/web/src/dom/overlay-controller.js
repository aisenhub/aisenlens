import {
  cloneOverlayShape,
  getOverlayHandleAtPosition,
  hitTestOverlayShape
} from '../features/overlay/overlay-controller.js';

const LINE_COLOR = 'rgba(255,255,255,0.7)';
const LINE_DASH = [6, 4];
const HANDLE_RADIUS = 8;

function drawTriangle(context, startX, startY, endX, endY, orientation) {
  const left = Math.min(startX, endX);
  const right = Math.max(startX, endX);
  const top = Math.min(startY, endY);
  const bottom = Math.max(startY, endY);
  const middleX = (left + right) / 2;
  const middleY = (top + bottom) / 2;
  switch ((orientation || 0) % 4) {
    case 0: context.moveTo(middleX, top); context.lineTo(right, bottom); context.lineTo(left, bottom); break;
    case 1: context.moveTo(right, middleY); context.lineTo(left, top); context.lineTo(left, bottom); break;
    case 2: context.moveTo(middleX, bottom); context.lineTo(left, top); context.lineTo(right, top); break;
    case 3: context.moveTo(left, middleY); context.lineTo(right, top); context.lineTo(right, bottom); break;
  }
  context.closePath();
}

function drawShape(context, shape, width, height) {
  context.strokeStyle = LINE_COLOR;
  context.lineWidth = 2;
  context.setLineDash(LINE_DASH);
  context.beginPath();
  const startX = shape.start.x * width;
  const startY = shape.start.y * height;
  const endX = shape.end.x * width;
  const endY = shape.end.y * height;
  switch (shape.type) {
    case 'line': context.moveTo(startX, startY); context.lineTo(endX, endY); break;
    case 'rect': context.rect(Math.min(startX, endX), Math.min(startY, endY), Math.abs(endX - startX), Math.abs(endY - startY)); break;
    case 'circle': {
      const radiusX = Math.abs(endX - startX) / 2;
      const radiusY = Math.abs(endY - startY) / 2;
      context.ellipse((startX + endX) / 2, (startY + endY) / 2, radiusX, radiusY, 0, 0, Math.PI * 2);
      break;
    }
    case 'triangle': drawTriangle(context, startX, startY, endX, endY, shape.orient || 0); break;
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
}

export function createOverlayController({
  canvas,
  video,
  button,
  menu,
  documentTarget = document,
  windowTarget = window,
  showToast = () => {}
} = {}) {
  const context = canvas?.getContext?.('2d');
  let mode = 'none';
  let shapes = [];
  let currentShape = null;
  let drawing = false;
  let selectedIndex = -1;
  let dragHandle = '';
  let dragStartMouse = null;
  let dragStartShape = null;
  let bound = false;

  const updateButtonState = () => {
    if (!button) return;
    const active = mode !== 'none' || shapes.length > 0;
    button.style.borderColor = active ? 'var(--accent)' : 'var(--border)';
    button.style.color = active ? 'var(--accent)' : 'var(--text)';
    button.style.background = active ? 'rgba(22,169,243,0.08)' : 'var(--input-bg)';
  };

  const drawHandle = (x, y, color) => {
    if (!context || !canvas) return;
    const pixelX = x * canvas.width;
    const pixelY = y * canvas.height;
    context.fillStyle = color || '#fff';
    context.strokeStyle = LINE_COLOR;
    context.setLineDash([]);
    context.lineWidth = 1;
    context.beginPath();
    context.arc(pixelX, pixelY, HANDLE_RADIUS, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  };

  const drawHandles = shape => {
    drawHandle(shape.start.x, shape.start.y, '#fff');
    drawHandle(shape.end.x, shape.end.y, '#fff');
    if (shape.type !== 'line') {
      drawHandle((shape.start.x + shape.end.x) / 2, (shape.start.y + shape.end.y) / 2, shape.type === 'triangle' ? '#aaf' : '#fff');
    }
    if (shape.type === 'curve' && shape.ctrl) {
      const width = canvas.width;
      const height = canvas.height;
      context.strokeStyle = '#ff0';
      context.setLineDash([3, 3]);
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(shape.start.x * width, shape.start.y * height);
      context.lineTo(shape.ctrl.x * width, shape.ctrl.y * height);
      context.stroke();
      context.beginPath();
      context.moveTo(shape.ctrl.x * width, shape.ctrl.y * height);
      context.lineTo(shape.end.x * width, shape.end.y * height);
      context.stroke();
      drawHandle(shape.ctrl.x, shape.ctrl.y, '#ff0');
    }
    if (shape.type === 'scurve' && shape.ctrl1 && shape.ctrl2) {
      const width = canvas.width;
      const height = canvas.height;
      context.strokeStyle = '#ff0';
      context.setLineDash([3, 3]);
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(shape.start.x * width, shape.start.y * height);
      context.lineTo(shape.ctrl1.x * width, shape.ctrl1.y * height);
      context.stroke();
      context.beginPath();
      context.moveTo(shape.ctrl1.x * width, shape.ctrl1.y * height);
      context.lineTo(shape.ctrl2.x * width, shape.ctrl2.y * height);
      context.stroke();
      context.beginPath();
      context.moveTo(shape.ctrl2.x * width, shape.ctrl2.y * height);
      context.lineTo(shape.end.x * width, shape.end.y * height);
      context.stroke();
      drawHandle(shape.ctrl1.x, shape.ctrl1.y, '#ff0');
      drawHandle(shape.ctrl2.x, shape.ctrl2.y, '#ff0');
    }
  };

  const drawGrid = () => {
    const width = canvas.width;
    const height = canvas.height;
    context.strokeStyle = LINE_COLOR;
    context.lineWidth = 1;
    context.setLineDash(LINE_DASH);
    context.beginPath();
    if (mode === 'thirds') {
      for (let index = 1; index <= 2; index++) {
        context.moveTo(width * index / 3, 0);
        context.lineTo(width * index / 3, height);
        context.moveTo(0, height * index / 3);
        context.lineTo(width, height * index / 3);
      }
    } else if (mode === 'cross') {
      context.moveTo(width / 2, 0); context.lineTo(width / 2, height);
      context.moveTo(0, height / 2); context.lineTo(width, height / 2);
    } else if (mode === 'hlines') {
      for (let index = 1; index <= 2; index++) { context.moveTo(0, height * index / 3); context.lineTo(width, height * index / 3); }
    } else if (mode === 'vlines') {
      for (let index = 1; index <= 2; index++) { context.moveTo(width * index / 3, 0); context.lineTo(width * index / 3, height); }
    } else if (mode === 'hline-center') {
      context.moveTo(0, height / 2); context.lineTo(width, height / 2);
    } else if (mode === 'vline-center') {
      context.moveTo(width / 2, 0); context.lineTo(width / 2, height);
    } else if (mode === 'diagonal') {
      context.moveTo(0, 0); context.lineTo(width, height); context.moveTo(width, 0); context.lineTo(0, height);
    } else if (mode === 'diag-left') {
      context.moveTo(0, 0); context.lineTo(width, height);
    } else if (mode === 'diag-right') {
      context.moveTo(width, 0); context.lineTo(0, height);
    }
    context.stroke();
  };

  const redraw = () => {
    if (!context || !canvas) return;
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    canvas.classList.toggle('drawing', mode.startsWith('draw-'));
    updateButtonState();
    if (mode === 'none' && shapes.length === 0) return;
    drawGrid();
    if (currentShape) drawShape(context, currentShape, width, height);
    shapes.forEach((shape, index) => { if (index !== selectedIndex) drawShape(context, shape, width, height); });
    if (selectedIndex >= 0 && selectedIndex < shapes.length) {
      const selected = shapes[selectedIndex];
      drawShape(context, selected, width, height);
      if (!drawing) drawHandles(selected);
    }
  };

  const getDisplayRect = () => {
    const stage = video?.closest?.('.monitor-surface') || video?.parentElement;
    if (!stage) return null;
    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    if (!stageWidth || !stageHeight) return null;
    const videoWidth = video.videoWidth || stageWidth;
    const videoHeight = video.videoHeight || stageHeight;
    const scale = Math.min(stageWidth / videoWidth, stageHeight / videoHeight);
    const width = videoWidth * scale;
    const height = videoHeight * scale;
    return { x: (stageWidth - width) / 2, y: (stageHeight - height) / 2, width, height };
  };

  const syncSize = () => {
    if (!canvas) return;
    const rect = getDisplayRect();
    if (!rect || !rect.width || !rect.height) return;
    canvas.width = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    canvas.style.top = `${rect.y}px`;
    canvas.style.left = `${rect.x}px`;
    redraw();
  };

  const getPoint = event => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height
    };
  };

  const finishDrawing = () => {
    if (!drawing || !currentShape) return;
    drawing = false;
    const width = Math.abs(currentShape.end.x - currentShape.start.x);
    const height = Math.abs(currentShape.end.y - currentShape.start.y);
    if (width > 0.003 || height > 0.003) {
      shapes.push(currentShape);
      selectedIndex = shapes.length - 1;
      if (currentShape.type === 'curve' || currentShape.type === 'scurve') showToast('拖动控制点微调曲线，完成点击空白处', 'info', 2200);
    }
    currentShape = null;
    redraw();
  };

  const onMouseDown = event => {
    const point = getPoint(event);
    if (selectedIndex >= 0 && !mode.startsWith('draw-')) { selectedIndex = -1; redraw(); return; }
    if (selectedIndex >= 0) {
      const selected = shapes[selectedIndex];
      const handle = getOverlayHandleAtPosition(selected, point.x, point.y, { width: canvas.width, height: canvas.height });
      if (handle) {
        if (selected.type === 'triangle' && handle === 'center' && event.detail === 2) {
          selected.orient = ((selected.orient || 0) + 1) % 4;
          dragStartShape = null;
          dragHandle = '';
          redraw();
          return;
        }
        dragHandle = handle;
        dragStartMouse = point;
        dragStartShape = cloneOverlayShape(selected);
        return;
      }
      selectedIndex = -1;
      redraw();
      return;
    }
    for (let index = shapes.length - 1; index >= 0; index--) {
      if (hitTestOverlayShape(shapes[index], point.x, point.y)) { selectedIndex = index; redraw(); return; }
    }
    if (mode.startsWith('draw-')) {
      drawing = true;
      selectedIndex = -1;
      const type = mode.replace('draw-', '');
      currentShape = { type, start: point, end: { ...point }, orient: 0 };
      if (type === 'curve') currentShape.ctrl = { ...point };
      if (type === 'scurve') { currentShape.ctrl1 = { ...point }; currentShape.ctrl2 = { ...point }; }
      redraw();
    }
  };

  const onMouseMove = event => {
    const point = getPoint(event);
    if (dragHandle && dragStartShape && dragStartMouse && selectedIndex >= 0) {
      const shape = shapes[selectedIndex];
      const deltaX = point.x - dragStartMouse.x;
      const deltaY = point.y - dragStartMouse.y;
      const original = dragStartShape;
      shape.start = { x: original.start.x, y: original.start.y };
      shape.end = { x: original.end.x, y: original.end.y };
      if (original.ctrl) shape.ctrl = { x: original.ctrl.x, y: original.ctrl.y };
      if (original.ctrl1) { shape.ctrl1 = { x: original.ctrl1.x, y: original.ctrl1.y }; shape.ctrl2 = { x: original.ctrl2.x, y: original.ctrl2.y }; }
      if (dragHandle === 'start') { shape.start.x += deltaX; shape.start.y += deltaY; }
      else if (dragHandle === 'end') { shape.end.x += deltaX; shape.end.y += deltaY; }
      else if (dragHandle === 'center') { shape.start.x += deltaX; shape.start.y += deltaY; shape.end.x += deltaX; shape.end.y += deltaY; }
      else if (dragHandle === 'ctrl') { shape.ctrl.x += deltaX; shape.ctrl.y += deltaY; }
      else if (dragHandle === 'ctrl1') { shape.ctrl1.x += deltaX; shape.ctrl1.y += deltaY; }
      else if (dragHandle === 'ctrl2') { shape.ctrl2.x += deltaX; shape.ctrl2.y += deltaY; }
      redraw();
      return;
    }
    if (!drawing || !currentShape) return;
    currentShape.end = { ...point };
    if (currentShape.type === 'curve') currentShape.ctrl = { x: currentShape.start.x + (point.x - currentShape.start.x) * 0.6, y: currentShape.start.y - (point.y - currentShape.start.y) * 0.5 };
    if (currentShape.type === 'scurve') {
      const deltaY = (point.y - currentShape.start.y) * 0.4;
      currentShape.ctrl1 = { x: currentShape.start.x + (point.x - currentShape.start.x) / 3, y: currentShape.start.y - deltaY };
      currentShape.ctrl2 = { x: currentShape.start.x + (point.x - currentShape.start.x) * 2 / 3, y: point.y + deltaY };
    }
    redraw();
  };

  const onMouseUp = () => {
    if (dragHandle) { dragHandle = ''; dragStartMouse = null; dragStartShape = null; redraw(); return; }
    finishDrawing();
  };

  const onMouseLeave = () => {
    if (dragHandle) { dragHandle = ''; dragStartMouse = null; dragStartShape = null; redraw(); return; }
    finishDrawing();
  };

  const applyMode = nextMode => {
    if (nextMode === 'none') {
      shapes = [];
      currentShape = null;
      selectedIndex = -1;
      drawing = false;
      mode = 'none';
    } else {
      selectedIndex = -1;
      currentShape = null;
      drawing = false;
      mode = nextMode;
    }
    menu?.querySelectorAll('button').forEach(item => item.classList.toggle('active', item.dataset.mode === mode));
    redraw();
  };

  const bindMenu = () => {
    if (!button || !menu) return;
    const positionMenu = () => {
      if (!menu.classList.contains('show')) return;
      const rect = button.getBoundingClientRect();
      const menuWidth = Math.max(menu.offsetWidth || 155, 155);
      const menuHeight = menu.offsetHeight || 260;
      const left = Math.max(8, Math.min(rect.right - menuWidth, windowTarget.innerWidth - menuWidth - 8));
      menu.style.left = `${left}px`;
      menu.style.top = `${Math.max(8, rect.top - menuHeight - 6)}px`;
    };
    button.addEventListener('click', event => {
      event.stopPropagation();
      menu.classList.toggle('show');
      button.setAttribute('aria-expanded', menu.classList.contains('show') ? 'true' : 'false');
      positionMenu();
    });
    menu.addEventListener('click', event => {
      const item = event.target.closest('button[data-mode]');
      if (!item) return;
      menu.classList.remove('show');
      button.setAttribute('aria-expanded', 'false');
      applyMode(item.dataset.mode);
    });
    documentTarget.addEventListener('click', event => {
      if (!button.contains(event.target) && !menu.contains(event.target)) {
        menu.classList.remove('show');
        button.setAttribute('aria-expanded', 'false');
      }
    });
    windowTarget.addEventListener('resize', positionMenu);
    windowTarget.addEventListener('scroll', positionMenu, true);
  };

  const bind = () => {
    if (bound) return;
    bound = true;
    if (canvas) {
      canvas.addEventListener('mousedown', onMouseDown);
      canvas.addEventListener('mousemove', onMouseMove);
      canvas.addEventListener('mouseup', onMouseUp);
      canvas.addEventListener('mouseleave', onMouseLeave);
    }
    documentTarget.addEventListener('keydown', event => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIndex >= 0) { shapes.splice(selectedIndex, 1); selectedIndex = -1; redraw(); }
      if (event.key === 'Escape' && selectedIndex >= 0) { selectedIndex = -1; redraw(); }
    });
    video?.addEventListener('loadedmetadata', () => windowTarget.setTimeout(syncSize, 50));
    windowTarget.addEventListener('resize', syncSize);
    const parent = video?.parentElement;
    if (parent && windowTarget.ResizeObserver) new windowTarget.ResizeObserver(syncSize).observe(parent);
    bindMenu();
  };

  return {
    bind,
    redraw,
    syncSize,
    applyMode,
    getMode: () => mode,
    getShapes: () => shapes
  };
}
