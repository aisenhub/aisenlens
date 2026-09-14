import { AlertCircle, FileVideo, LoaderCircle, RotateCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../components/ui/button";
import type { VideoPlaybackStatus } from "../hooks/useVideoPlayback";
import CompositionOverlay from "../../composition-overlay/components/CompositionOverlay";
import type { CompositionDrawingTool, CompositionOverlayShape, CompositionOverlaySettings } from "../../composition-overlay/types";
import ContentOverlay from "../../content-overlay/components/ContentOverlay";
import type { ContentOverlayViewModel } from "../../content-overlay/services/contentOverlayResolver";
import type { ContentOverlaySettings } from "../../content-overlay/types";

export interface CanvasAspectPreset { label: string; width: number; height: number; }

export interface VideoPreviewCanvasProps {
  showCompositionGrid: boolean;
  compositionOverlay: CompositionOverlaySettings;
  contentOverlay: ContentOverlaySettings;
  contentOverlayModel: ContentOverlayViewModel;
  isCompositionOverlayEditing: boolean;
  compositionDrawingTool: CompositionDrawingTool;
  selectedCompositionShapeId: string | null;
  onCompositionShapesChange: (shapes: CompositionOverlayShape[]) => void;
  onCompositionShapeEditEnd: (shapes: CompositionOverlayShape[]) => void;
  onSelectedCompositionShapeChange: (shapeId: string | null) => void;
  onCompositionDrawingToolChange: (tool: CompositionDrawingTool) => void;
  backgroundColor: string | null;
  zoom: number;
  aspectPreset: CanvasAspectPreset;
  fullscreenRequest: number;
  compositionCancelRequest: number;
  onFullscreenChange: (isFullscreen: boolean) => void;
  onActivate: () => void;
  sourceWidth: number;
  sourceHeight: number;
  videoUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: VideoPlaybackStatus;
  errorMessage: string | null;
  onRetry: () => void;
  onLoadedMetadata: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
  onTimeUpdate: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
  onSeeking: () => void;
  onSeeked: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
  onWaiting: () => void;
  onCanPlay: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
  onError: () => void;
}

export const CANVAS_ZOOM_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const CANVAS_ASPECT_PRESETS: CanvasAspectPreset[] = [
  { label: "16:9", width: 1920, height: 1080 },
  { label: "9:16", width: 1080, height: 1920 },
  { label: "1:1", width: 1080, height: 1080 },
  { label: "4:5", width: 1080, height: 1350 },
  { label: "4:3", width: 1440, height: 1080 },
  { label: "21:9", width: 2560, height: 1080 },
];

export function closestCanvasAspectPreset(width: number, height: number) {
  const ratio = width > 0 && height > 0 ? width / height : 16 / 9;
  return CANVAS_ASPECT_PRESETS.reduce((closest, preset) => Math.abs(preset.width / preset.height - ratio) < Math.abs(closest.width / closest.height - ratio) ? preset : closest, CANVAS_ASPECT_PRESETS[0]);
}

export default function VideoPreviewCanvas({ showCompositionGrid, compositionOverlay, contentOverlay, contentOverlayModel, isCompositionOverlayEditing, compositionDrawingTool, selectedCompositionShapeId, onCompositionShapesChange, onCompositionShapeEditEnd, onSelectedCompositionShapeChange, onCompositionDrawingToolChange, backgroundColor, zoom, aspectPreset, fullscreenRequest, compositionCancelRequest, onFullscreenChange, onActivate, sourceWidth, sourceHeight, videoUrl, videoRef, status, errorMessage, onRetry, onLoadedMetadata, onTimeUpdate, onPlay, onPause, onEnded, onSeeking, onSeeked, onWaiting, onCanPlay, onError }: VideoPreviewCanvasProps) {
  const isLoading = status === "loading";
  const stageRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const panSessionRef = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [fullscreenSize, setFullscreenSize] = useState({ width: 0, height: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleFullscreenChange = () => {
      const nextIsFullscreen = document.fullscreenElement === previewRef.current;
      setIsFullscreen(nextIsFullscreen);
      onFullscreenChange(nextIsFullscreen);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [onFullscreenChange]);

  useEffect(() => {
    const stage = stageRef.current;
    const preview = previewRef.current;
    if (!stage || !preview) return;
    const updateSize = () => setStageSize({ width: stage.clientWidth, height: stage.clientHeight });
    const updateFullscreenSize = () => setFullscreenSize({ width: preview.clientWidth, height: preview.clientHeight });
    const observer = new ResizeObserver(() => {
      updateSize();
      updateFullscreenSize();
    });
    observer.observe(stage);
    observer.observe(preview);
    updateSize();
    updateFullscreenSize();
    return () => observer.disconnect();
  }, []);

  useEffect(() => setPan({ x: 0, y: 0 }), [aspectPreset, isFullscreen, zoom]);

  useEffect(() => {
    if (fullscreenRequest === 0) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void previewRef.current?.requestFullscreen();
  }, [fullscreenRequest]);

  const themeCanvasBackground = document.documentElement.dataset.theme === "light" ? "#eeede9" : "#050505";
  const canvasBackground = backgroundColor ?? themeCanvasBackground;
  const previewSize = useMemo(() => {
    if (isFullscreen || stageSize.width <= 0 || stageSize.height <= 0) return null;
    const aspectRatio = aspectPreset.width / aspectPreset.height;
    const maxWidth = Math.max(1, stageSize.width - 16);
    const maxHeight = Math.max(1, stageSize.height - 16);
    const width = Math.min(maxWidth, maxHeight * aspectRatio);
    return { width, height: width / aspectRatio };
  }, [aspectPreset.height, aspectPreset.width, isFullscreen, stageSize.height, stageSize.width]);
  const canvasSize = useMemo(() => {
    const baseWidth = isFullscreen ? fullscreenSize.width : previewSize?.width ?? stageSize.width;
    const width = baseWidth * zoom;
    return { width, height: width / (aspectPreset.width / aspectPreset.height) };
  }, [aspectPreset.height, aspectPreset.width, fullscreenSize.width, isFullscreen, previewSize?.width, stageSize.width, zoom]);
  const viewportWidth = isFullscreen ? fullscreenSize.width : previewSize?.width ?? stageSize.width;
  const viewportHeight = isFullscreen ? fullscreenSize.height : previewSize?.height ?? stageSize.height;
  const canPan = canvasSize.width > viewportWidth || canvasSize.height > viewportHeight;
  const videoFrame = useMemo(() => {
    const sourceAspectRatio = sourceWidth > 0 && sourceHeight > 0 ? sourceWidth / sourceHeight : aspectPreset.width / aspectPreset.height;
    const canvasAspectRatio = canvasSize.width / Math.max(1, canvasSize.height);
    const width = sourceAspectRatio > canvasAspectRatio ? canvasSize.width : canvasSize.height * sourceAspectRatio;
    const height = width / sourceAspectRatio;
    return { width, height };
  }, [aspectPreset.height, aspectPreset.width, canvasSize.height, canvasSize.width, sourceHeight, sourceWidth]);

  const handlePanPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canPan || event.button !== 1) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    panSessionRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, originX: pan.x, originY: pan.y };
  };
  const handlePanPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    const viewport = viewportRef.current;
    if (!session || session.pointerId !== event.pointerId || !viewport) return;
    const maxX = Math.max(0, (canvasSize.width - viewport.clientWidth) / 2);
    const maxY = Math.max(0, (canvasSize.height - viewport.clientHeight) / 2);
    setPan({ x: Math.max(-maxX, Math.min(maxX, session.originX + event.clientX - session.x)), y: Math.max(-maxY, Math.min(maxY, session.originY + event.clientY - session.y)) });
  };
  const handlePanPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panSessionRef.current?.pointerId !== event.pointerId) return;
    panSessionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <div ref={stageRef} onPointerDownCapture={onActivate} className="flex h-full min-h-0 w-full min-w-0 items-center justify-center">
    <div ref={previewRef} className={`relative overflow-hidden border border-white/10 bg-bg-deep ${isFullscreen ? "h-full w-full rounded-none" : "rounded-xl"}`} style={{ width: previewSize?.width, height: previewSize?.height, aspectRatio: previewSize ? undefined : aspectPreset.width / aspectPreset.height }}>
      <div ref={viewportRef} className={`absolute inset-0 overflow-hidden ${canPan ? "cursor-grab" : ""}`} onPointerDown={handlePanPointerDown} onPointerMove={handlePanPointerMove} onPointerUp={handlePanPointerUp} onPointerCancel={handlePanPointerUp}>
        <div className="absolute left-1/2 top-1/2" style={{ width: canvasSize.width, height: canvasSize.height, transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))` }}>
          <div className="relative h-full w-full" style={{ backgroundColor: canvasBackground }}>
            <video ref={videoRef} src={videoUrl ?? undefined} className="absolute inset-0 h-full w-full object-contain" controls={false} preload="metadata" onLoadedMetadata={onLoadedMetadata} onTimeUpdate={onTimeUpdate} onPlay={onPlay} onPause={onPause} onEnded={onEnded} onSeeking={onSeeking} onSeeked={onSeeked} onWaiting={onWaiting} onCanPlay={onCanPlay} onError={onError} />
            {contentOverlay.enabled && <div className="pointer-events-none absolute left-1/2 top-1/2" style={{ width: videoFrame.width, height: videoFrame.height, transform: "translate(-50%, -50%)" }}><ContentOverlay layout={contentOverlay.layout} model={contentOverlayModel} showBackground={contentOverlay.showBackground} backgroundOpacity={contentOverlay.backgroundOpacity} /></div>}
            <div className={`absolute inset-0 ${isCompositionOverlayEditing ? "" : "pointer-events-none"}`}>
              {showCompositionGrid && <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "linear-gradient(rgba(59,130,246,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.8) 1px,transparent 1px)", backgroundSize: "33.33% 33.33%" }} />}
              <CompositionOverlay settings={compositionOverlay} isEditing={isCompositionOverlayEditing} drawingTool={compositionDrawingTool} selectedShapeId={selectedCompositionShapeId} cancelRequest={compositionCancelRequest} onShapesChange={onCompositionShapesChange} onShapeEditEnd={onCompositionShapeEditEnd} onSelectedShapeChange={onSelectedCompositionShapeChange} onDrawingToolChange={onCompositionDrawingToolChange} />
            </div>
          </div>
        </div>
      </div>
      {isLoading && videoUrl && <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/25"><div className="flex items-center gap-2 rounded-full border border-white/10 bg-bg-deep/80 px-3 py-1.5 font-mono editor-meta text-text-dim backdrop-blur"><LoaderCircle className="size-3.5 animate-spin text-accent" />正在加载视频</div></div>}
      {!videoUrl && <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-bg-deep/90"><div className="flex flex-col items-center text-center"><FileVideo className="size-8 text-text-muted" /><p className="mt-3 editor-heading font-medium text-white">暂无视频素材</p><p className="mt-1 editor-meta text-text-muted">请在左侧“素材”中导入视频</p></div></div>}
      {status === "error" && <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg-deep/90 p-6"><div className="flex max-w-xs flex-col items-center text-center"><AlertCircle className="size-6 text-red-300" /><p className="mt-3 editor-heading font-medium text-white">视频无法播放</p><p className="mt-1 editor-meta text-text-muted">{errorMessage}</p><Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-4 h-7 editor-body font-normal border-border text-text-dim hover:text-white"><RotateCw className="size-3" />重新加载</Button></div></div>}
    </div>
  </div>;
}
