import { useEffect, useId, useRef, useState } from "react";
import type { CompositionDrawingTool, CompositionOverlayShape, CompositionOverlaySettings, CompositionPoint } from "../types";

type TransformHandle = "move" | "start" | "end" | "control" | "rotate" | "top-left" | "top" | "top-right" | "right" | "bottom-right" | "bottom" | "bottom-left" | "left";

interface CompositionOverlayProps {
  settings: CompositionOverlaySettings;
  isEditing?: boolean;
  drawingTool?: CompositionDrawingTool;
  selectedShapeId?: string | null;
  cancelRequest?: number;
  onShapesChange?: (shapes: CompositionOverlayShape[]) => void;
  onShapeEditStart?: (shapes: CompositionOverlayShape[]) => void;
  onShapeEditEnd?: (shapes: CompositionOverlayShape[]) => void;
  onSelectedShapeChange?: (shapeId: string | null) => void;
  onDrawingToolChange?: (tool: CompositionDrawingTool) => void;
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clampPoint(point: CompositionPoint): CompositionPoint {
  return { x: Math.max(0, Math.min(100, point.x)), y: Math.max(0, Math.min(100, point.y)) };
}

function getShapeBounds(shape: CompositionOverlayShape): Bounds {
  return { x: Math.min(shape.start.x, shape.end.x), y: Math.min(shape.start.y, shape.end.y), width: Math.abs(shape.end.x - shape.start.x), height: Math.abs(shape.end.y - shape.start.y) };
}

function getShapeCenter(shape: CompositionOverlayShape): CompositionPoint {
  const bounds = getShapeBounds(shape);
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

function isClosedShape(shape: CompositionOverlayShape) {
  return shape.type === "rectangle" || shape.type === "ellipse" || shape.type === "triangle";
}

function cloneShape(shape: CompositionOverlayShape): CompositionOverlayShape {
  return { ...shape, start: { ...shape.start }, end: { ...shape.end }, ...(shape.control ? { control: { ...shape.control } } : {}) };
}

function cloneShapes(shapes: CompositionOverlayShape[]) {
  return shapes.map(cloneShape);
}

function rotatePoint(point: CompositionPoint, center: CompositionPoint, degrees: number): CompositionPoint {
  const radians = (degrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const deltaX = point.x - center.x;
  const deltaY = point.y - center.y;
  return { x: center.x + deltaX * cosine - deltaY * sine, y: center.y + deltaX * sine + deltaY * cosine };
}

function constrainPoint(origin: CompositionPoint, point: CompositionPoint, type: CompositionOverlayShape["type"], constrain: boolean): CompositionPoint {
  if (!constrain) return clampPoint(point);
  const deltaX = point.x - origin.x;
  const deltaY = point.y - origin.y;
  if (type === "line" || type === "arrow") {
    const distance = Math.hypot(deltaX, deltaY);
    const angle = Math.round(Math.atan2(deltaY, deltaX) / (Math.PI / 4)) * (Math.PI / 4);
    return clampPoint({ x: origin.x + Math.cos(angle) * distance, y: origin.y + Math.sin(angle) * distance });
  }
  const length = Math.max(Math.abs(deltaX), Math.abs(deltaY));
  return clampPoint({ x: origin.x + Math.sign(deltaX || 1) * length, y: origin.y + Math.sign(deltaY || 1) * length });
}

function GuideLines({ settings }: { settings: CompositionOverlaySettings }) {
  const lineProps = { stroke: settings.color, strokeOpacity: settings.opacity, strokeWidth: settings.lineWidth, strokeDasharray: settings.lineStyle === "dashed" ? "6 4" : undefined, vectorEffect: "non-scaling-stroke" as const };
  const lines: React.ReactNode[] = [];
  const addVertical = (position: number) => lines.push(<line key={`v-${position}`} x1={position} x2={position} y1="0" y2="100" {...lineProps} />);
  const addHorizontal = (position: number) => lines.push(<line key={`h-${position}`} x1="0" x2="100" y1={position} y2={position} {...lineProps} />);
  if (settings.guide === "thirds") [100 / 3, 200 / 3].forEach((position) => { addVertical(position); addHorizontal(position); });
  if (settings.guide === "center") { addVertical(50); addHorizontal(50); }
  if (settings.guide === "diagonal") lines.push(<line key="d-a" x1="0" y1="0" x2="100" y2="100" {...lineProps} />, <line key="d-b" x1="100" y1="0" x2="0" y2="100" {...lineProps} />);
  if (settings.guide === "horizontal-thirds") [100 / 3, 200 / 3].forEach(addHorizontal);
  if (settings.guide === "vertical-thirds") [100 / 3, 200 / 3].forEach(addVertical);
  if (settings.guide === "golden-ratio") [38.2, 61.8].forEach((position) => { addVertical(position); addHorizontal(position); });
  if (settings.guide === "grid") {
    Array.from({ length: settings.gridColumns - 1 }, (_, index) => ((index + 1) / settings.gridColumns) * 100).forEach(addVertical);
    Array.from({ length: settings.gridRows - 1 }, (_, index) => ((index + 1) / settings.gridRows) * 100).forEach(addHorizontal);
  }
  return lines;
}

function ControlHandle({ point, handle, cursor, onPointerDown }: { point: CompositionPoint; handle: TransformHandle; cursor: string; onPointerDown: (event: React.PointerEvent<SVGElement>, handle: TransformHandle) => void }) {
  return <g>
    <rect x={point.x - 2.5} y={point.y - 2.5} width="5" height="5" fill="transparent" pointerEvents="all" className={cursor} onPointerDown={(event) => { event.stopPropagation(); onPointerDown(event, handle); }} />
    <rect x={point.x - 0.8} y={point.y - 0.8} width="1.6" height="1.6" rx="0.25" fill="#ffffff" stroke="#38bdf8" strokeWidth="0.8" vectorEffect="non-scaling-stroke" pointerEvents="none" />
  </g>;
}

function OverlayShape({ shape, selected, interactive, markerId, settings, onPointerDown }: { shape: CompositionOverlayShape; selected: boolean; interactive: boolean; markerId: string; settings: CompositionOverlaySettings; onPointerDown: (event: React.PointerEvent<SVGElement>, handle: TransformHandle) => void }) {
  const bounds = getShapeBounds(shape);
  const center = getShapeCenter(shape);
  const isClosed = isClosedShape(shape);
  const rotation = isClosed ? shape.rotation ?? 0 : 0;
  const common = { fill: "none", stroke: settings.color, strokeOpacity: settings.opacity, strokeWidth: settings.lineWidth, strokeDasharray: settings.lineStyle === "dashed" ? "6 4" : undefined, vectorEffect: "non-scaling-stroke" as const };
  const markerEnd = shape.type === "arrow" ? `url(#${markerId})` : undefined;
  const trianglePoints = `${center.x},${bounds.y} ${bounds.x + bounds.width},${bounds.y + bounds.height} ${bounds.x},${bounds.y + bounds.height}`;
  const control = shape.control ?? { x: (shape.start.x + shape.end.x) / 2, y: (shape.start.y + shape.end.y) / 2 };
  const transform = rotation ? `rotate(${rotation} ${center.x} ${center.y})` : undefined;
  const corners: Array<{ handle: TransformHandle; point: CompositionPoint; cursor: string }> = [
    { handle: "top-left", point: { x: bounds.x, y: bounds.y }, cursor: "cursor-nwse-resize" },
    { handle: "top-right", point: { x: bounds.x + bounds.width, y: bounds.y }, cursor: "cursor-nesw-resize" },
    { handle: "bottom-right", point: { x: bounds.x + bounds.width, y: bounds.y + bounds.height }, cursor: "cursor-nwse-resize" },
    { handle: "bottom-left", point: { x: bounds.x, y: bounds.y + bounds.height }, cursor: "cursor-nesw-resize" },
  ];
  const edges: Array<{ handle: TransformHandle; point: CompositionPoint; cursor: string }> = [
    { handle: "top", point: { x: center.x, y: bounds.y }, cursor: "cursor-ns-resize" },
    { handle: "right", point: { x: bounds.x + bounds.width, y: center.y }, cursor: "cursor-ew-resize" },
    { handle: "bottom", point: { x: center.x, y: bounds.y + bounds.height }, cursor: "cursor-ns-resize" },
    { handle: "left", point: { x: bounds.x, y: center.y }, cursor: "cursor-ew-resize" },
  ];
  const rotateAnchor = rotatePoint({ x: center.x, y: bounds.y - 1 }, center, rotation);
  const rotateHandle = rotatePoint({ x: center.x, y: bounds.y - 8 }, center, rotation);
  const begin = (event: React.PointerEvent<SVGElement>, handle: TransformHandle) => { event.stopPropagation(); onPointerDown(event, handle); };
  const linear = shape.type === "line" || shape.type === "arrow" || shape.type === "curve";

  return <g>
    <g transform={transform}>
      {interactive && (linear ? (shape.type === "curve" ? <path d={`M ${shape.start.x} ${shape.start.y} Q ${control.x} ${control.y} ${shape.end.x} ${shape.end.y}`} fill="none" stroke="transparent" strokeWidth="12" className="cursor-move" pointerEvents="stroke" onPointerDown={(event) => begin(event, "move")} /> : <line x1={shape.start.x} y1={shape.start.y} x2={shape.end.x} y2={shape.end.y} stroke="transparent" strokeWidth="12" className="cursor-move" pointerEvents="stroke" onPointerDown={(event) => begin(event, "move")} />) : shape.type === "rectangle" ? <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill="transparent" className="cursor-move" pointerEvents="all" onPointerDown={(event) => begin(event, "move")} /> : shape.type === "ellipse" ? <ellipse cx={center.x} cy={center.y} rx={bounds.width / 2} ry={bounds.height / 2} fill="transparent" className="cursor-move" pointerEvents="all" onPointerDown={(event) => begin(event, "move")} /> : <polygon points={trianglePoints} fill="transparent" className="cursor-move" pointerEvents="all" onPointerDown={(event) => begin(event, "move")} />)}
      {shape.type === "line" || shape.type === "arrow" ? <line x1={shape.start.x} y1={shape.start.y} x2={shape.end.x} y2={shape.end.y} markerEnd={markerEnd} {...common} pointerEvents="none" /> : shape.type === "curve" ? <path d={`M ${shape.start.x} ${shape.start.y} Q ${control.x} ${control.y} ${shape.end.x} ${shape.end.y}`} {...common} pointerEvents="none" /> : shape.type === "rectangle" ? <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} {...common} pointerEvents="none" /> : shape.type === "ellipse" ? <ellipse cx={center.x} cy={center.y} rx={bounds.width / 2} ry={bounds.height / 2} {...common} pointerEvents="none" /> : <polygon points={trianglePoints} {...common} pointerEvents="none" />}
      {selected && isClosed && <><rect x={bounds.x - 0.65} y={bounds.y - 0.65} width={Math.max(1.3, bounds.width + 1.3)} height={Math.max(1.3, bounds.height + 1.3)} fill="none" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="2.4 1.8" vectorEffect="non-scaling-stroke" pointerEvents="none" />{corners.map(({ handle, point, cursor }) => <ControlHandle key={handle} point={point} handle={handle} cursor={cursor} onPointerDown={onPointerDown} />)}{edges.map(({ handle, point, cursor }) => <ControlHandle key={handle} point={point} handle={handle} cursor={cursor} onPointerDown={onPointerDown} />)}</>}
    </g>
    {selected && isClosed && <><line x1={rotateAnchor.x} y1={rotateAnchor.y} x2={rotateHandle.x} y2={rotateHandle.y} stroke="#38bdf8" strokeWidth="0.8" vectorEffect="non-scaling-stroke" pointerEvents="none" /><circle cx={rotateHandle.x} cy={rotateHandle.y} r="2.8" fill="transparent" pointerEvents="all" className="cursor-grab" onPointerDown={(event) => begin(event, "rotate")} /><g transform={`translate(${rotateHandle.x} ${rotateHandle.y}) rotate(${rotation})`} pointerEvents="none"><path d="M -1.2 0.6 A 1.35 1.35 0 1 1 1.2 -0.6" fill="none" stroke="#ffffff" strokeWidth="0.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" /><path d="M 1.2 -0.6 L 0.45 -0.65 L 1.05 0.02" fill="none" stroke="#ffffff" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></g></>}
    {selected && linear && <><circle cx={shape.start.x} cy={shape.start.y} r="2.8" fill="transparent" pointerEvents="all" className="cursor-crosshair" onPointerDown={(event) => begin(event, "start")} /><circle cx={shape.start.x} cy={shape.start.y} r="1.05" fill="#ffffff" stroke="#38bdf8" strokeWidth="0.75" vectorEffect="non-scaling-stroke" pointerEvents="none" /><circle cx={shape.end.x} cy={shape.end.y} r="2.8" fill="transparent" pointerEvents="all" className="cursor-crosshair" onPointerDown={(event) => begin(event, "end")} /><circle cx={shape.end.x} cy={shape.end.y} r="1.05" fill="#ffffff" stroke="#38bdf8" strokeWidth="0.75" vectorEffect="non-scaling-stroke" pointerEvents="none" />{shape.type === "curve" && <><line x1={shape.start.x} y1={shape.start.y} x2={control.x} y2={control.y} stroke="#eab308" strokeWidth="0.8" strokeDasharray="2.4 1.8" vectorEffect="non-scaling-stroke" pointerEvents="none" /><line x1={control.x} y1={control.y} x2={shape.end.x} y2={shape.end.y} stroke="#eab308" strokeWidth="0.8" strokeDasharray="2.4 1.8" vectorEffect="non-scaling-stroke" pointerEvents="none" /><circle cx={control.x} cy={control.y} r="2.8" fill="transparent" pointerEvents="all" className="cursor-move" onPointerDown={(event) => begin(event, "control")} /><circle cx={control.x} cy={control.y} r="1.05" fill="#facc15" stroke="#ffffff" strokeWidth="0.75" vectorEffect="non-scaling-stroke" pointerEvents="none" /></>}</>}
  </g>;
}

function createShapeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `composition-shape-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function shapeFromBounds(source: CompositionOverlayShape, bounds: Bounds) {
  return { ...source, start: { x: bounds.x, y: bounds.y }, end: { x: bounds.x + bounds.width, y: bounds.y + bounds.height } };
}

function resizeClosedShape(source: CompositionOverlayShape, handle: Exclude<TransformHandle, "move" | "start" | "end" | "control" | "rotate">, point: CompositionPoint, constrain: boolean): CompositionOverlayShape {
  const sourceBounds = getShapeBounds(source);
  const center = getShapeCenter(source);
  const localPoint = clampPoint(rotatePoint(point, center, -(source.rotation ?? 0)));
  const next = { ...sourceBounds };
  const minimumSize = 0.5;
  const horizontal = handle === "left" || handle === "right" || handle.includes("left") || handle.includes("right");
  const vertical = handle === "top" || handle === "bottom" || handle.includes("top") || handle.includes("bottom");
  const fromLeft = handle === "left" || handle.includes("left");
  const fromTop = handle === "top" || handle.includes("top");
  if (horizontal) {
    const fixedX = fromLeft ? sourceBounds.x + sourceBounds.width : sourceBounds.x;
    next.x = Math.min(fixedX - minimumSize, localPoint.x);
    next.width = Math.max(minimumSize, Math.abs(localPoint.x - fixedX));
  }
  if (vertical) {
    const fixedY = fromTop ? sourceBounds.y + sourceBounds.height : sourceBounds.y;
    next.y = Math.min(fixedY - minimumSize, localPoint.y);
    next.height = Math.max(minimumSize, Math.abs(localPoint.y - fixedY));
  }
  if (constrain && horizontal && vertical && sourceBounds.width > 0 && sourceBounds.height > 0) {
    const ratio = sourceBounds.width / sourceBounds.height;
    if (next.width / next.height > ratio) next.width = Math.max(minimumSize, next.height * ratio);
    else next.height = Math.max(minimumSize, next.width / ratio);
    if (fromLeft) next.x = sourceBounds.x + sourceBounds.width - next.width;
    if (fromTop) next.y = sourceBounds.y + sourceBounds.height - next.height;
  }
  next.x = Math.max(0, Math.min(100 - next.width, next.x));
  next.y = Math.max(0, Math.min(100 - next.height, next.y));
  return shapeFromBounds(source, next);
}

export default function CompositionOverlay({ settings, isEditing = false, drawingTool = "select", selectedShapeId = null, cancelRequest = 0, onShapesChange, onShapeEditStart, onShapeEditEnd, onSelectedShapeChange, onDrawingToolChange }: CompositionOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const shapesRef = useRef(settings.shapes);
  const [draftShape, setDraftShape] = useState<CompositionOverlayShape | null>(null);
  const transformRef = useRef<{ pointerId: number; shapeId: string; handle: TransformHandle; point: CompositionPoint; shape: CompositionOverlayShape } | null>(null);
  const markerId = useId().replace(/:/g, "");
  const isDrawing = isEditing && drawingTool !== "select";

  useEffect(() => { shapesRef.current = settings.shapes; }, [settings.shapes]);
  const getPoint = (event: React.PointerEvent<SVGSVGElement | SVGElement>): CompositionPoint => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return clampPoint({ x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 });
  };
  const publishShapes = (shapes: CompositionOverlayShape[]) => { shapesRef.current = shapes; onShapesChange?.(shapes); };
  const cancelTransform = () => {
    const transform = transformRef.current;
    if (!transform) return;
    publishShapes(shapesRef.current.map((shape) => shape.id === transform.shapeId ? cloneShape(transform.shape) : shape));
    transformRef.current = null;
  };
  useEffect(() => {
    if (cancelRequest === 0) return;
    setDraftShape(null);
    cancelTransform();
  }, [cancelRequest]);
  const startTransform = (event: React.PointerEvent<SVGElement>, shape: CompositionOverlayShape, handle: TransformHandle) => {
    if (!isEditing || isDrawing) return;
    event.preventDefault();
    if (handle === "move" && selectedShapeId !== shape.id) { onSelectedShapeChange?.(shape.id); return; }
    svgRef.current?.setPointerCapture(event.pointerId);
    transformRef.current = { pointerId: event.pointerId, shapeId: shape.id, handle, point: getPoint(event), shape: cloneShape(shape) };
    onSelectedShapeChange?.(shape.id);
    onShapeEditStart?.(cloneShapes(shapesRef.current));
  };
  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!isEditing) return;
    if (!isDrawing) { onSelectedShapeChange?.(null); return; }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getPoint(event);
    onShapeEditStart?.(cloneShapes(shapesRef.current));
    setDraftShape({ id: createShapeId(), type: drawingTool, start: point, end: point, ...(drawingTool === "curve" ? { control: { ...point } } : {}) });
    onSelectedShapeChange?.(null);
  };
  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (draftShape && isDrawing) {
      const end = constrainPoint(draftShape.start, getPoint(event), draftShape.type, event.shiftKey);
      setDraftShape({ ...draftShape, end, ...(draftShape.type === "curve" ? { control: { x: (draftShape.start.x + end.x) / 2, y: draftShape.start.y - (end.y - draftShape.start.y) * 0.5 } } : {}) });
      return;
    }
    const transform = transformRef.current;
    if (!transform || transform.pointerId !== event.pointerId) return;
    const point = getPoint(event);
    const source = transform.shape;
    let nextShape: CompositionOverlayShape;
    if (transform.handle === "start") nextShape = { ...source, start: constrainPoint(source.end, point, source.type, event.shiftKey) };
    else if (transform.handle === "end") nextShape = { ...source, end: constrainPoint(source.start, point, source.type, event.shiftKey) };
    else if (transform.handle === "control") nextShape = { ...source, control: point };
    else if (transform.handle === "rotate") {
      const center = getShapeCenter(source);
      let rotation = Math.atan2(point.y - center.y, point.x - center.x) * (180 / Math.PI) + 90;
      if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
      nextShape = { ...source, rotation: ((rotation % 360) + 360) % 360 };
    } else if (transform.handle !== "move") nextShape = resizeClosedShape(source, transform.handle, point, event.shiftKey);
    else {
      const deltaX = point.x - transform.point.x;
      const deltaY = point.y - transform.point.y;
      const bounds = getShapeBounds(source);
      const moveX = Math.max(-bounds.x, Math.min(100 - bounds.x - bounds.width, deltaX));
      const moveY = Math.max(-bounds.y, Math.min(100 - bounds.y - bounds.height, deltaY));
      nextShape = { ...source, start: { x: source.start.x + moveX, y: source.start.y + moveY }, end: { x: source.end.x + moveX, y: source.end.y + moveY }, ...(source.control ? { control: { x: source.control.x + moveX, y: source.control.y + moveY } } : {}) };
    }
    publishShapes(shapesRef.current.map((shape) => shape.id === transform.shapeId ? nextShape : shape));
  };
  const finishInteraction = (event: React.PointerEvent<SVGSVGElement>) => {
    if (draftShape) {
      const end = constrainPoint(draftShape.start, getPoint(event), draftShape.type, event.shiftKey);
      const completedShape = { ...draftShape, end, ...(draftShape.type === "curve" ? { control: { x: (draftShape.start.x + end.x) / 2, y: draftShape.start.y - (end.y - draftShape.start.y) * 0.5 } } : {}) };
      setDraftShape(null);
      if (Math.abs(completedShape.end.x - completedShape.start.x) >= 0.5 || Math.abs(completedShape.end.y - completedShape.start.y) >= 0.5) {
        const nextShapes = [...shapesRef.current, completedShape];
        publishShapes(nextShapes);
        onShapeEditEnd?.(nextShapes);
        onSelectedShapeChange?.(completedShape.id);
        onDrawingToolChange?.("select");
      }
    } else if (transformRef.current?.pointerId === event.pointerId) {
      transformRef.current = null;
      onShapeEditEnd?.(shapesRef.current);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const cancelInteraction = (event: React.PointerEvent<SVGSVGElement>) => {
    setDraftShape(null);
    cancelTransform();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  if (!settings.enabled || (!isEditing && settings.guide === "none" && !settings.showSafeMargins && settings.shapes.length === 0 && !draftShape)) return null;
  return <svg ref={svgRef} aria-label="构图辅助蒙版" className={`absolute inset-0 z-20 h-full w-full touch-none ${isEditing ? (isDrawing ? "cursor-crosshair" : "cursor-default") : "pointer-events-none"}`} viewBox="0 0 100 100" preserveAspectRatio="none" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={finishInteraction} onPointerCancel={cancelInteraction}>
    <defs><marker id={markerId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6,3 L0,6 Z" fill={settings.color} fillOpacity={settings.opacity} /></marker></defs>
    <g className="pointer-events-none"><GuideLines settings={settings} />{settings.showSafeMargins && <><rect x="5" y="5" width="90" height="90" fill="none" stroke={settings.color} strokeOpacity={Math.min(1, settings.opacity + 0.1)} strokeWidth={settings.lineWidth} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" /><rect x="10" y="10" width="80" height="80" fill="none" stroke={settings.color} strokeOpacity={settings.opacity} strokeWidth={settings.lineWidth} vectorEffect="non-scaling-stroke" /></>}</g>
    {settings.shapes.map((shape) => <OverlayShape key={shape.id} shape={shape} selected={isEditing && selectedShapeId === shape.id} interactive={isEditing && !isDrawing} markerId={markerId} settings={settings} onPointerDown={(event, handle) => startTransform(event, shape, handle)} />)}
    {draftShape && <OverlayShape shape={draftShape} selected={false} interactive={false} markerId={markerId} settings={settings} onPointerDown={() => undefined} />}
  </svg>;
}
