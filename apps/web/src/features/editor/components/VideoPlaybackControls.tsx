import { Maximize2, Minimize2, Pause, Play, Proportions, SkipBack, SkipForward, StepBack, StepForward, Volume2, VolumeX, ZoomIn } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "../../../components/ui/dropdown-menu";
import { FRAMES_PER_SECOND } from "../constants/editor";
import formatTimecode from "../utils/formatTimecode";
import { CANVAS_ASPECT_PRESETS, CANVAS_ZOOM_OPTIONS, type CanvasAspectPreset } from "./VideoPreviewCanvas";

interface VideoPlaybackControlsProps { currentTime: number; durationSeconds: number; isPlaying: boolean; isUnavailable: boolean; isMuted: boolean; zoom: number; aspectPreset: CanvasAspectPreset; showSafeMargins: boolean; isFullscreen: boolean; onPreviousShot: () => void; onNextShot: () => void; onCurrentTimeChange: (time: number) => void; onPlayingChange: (isPlaying: boolean) => void; onMutedChange: (isMuted: boolean) => void; onZoomChange: (zoom: number) => void; onAspectPresetChange: (preset: CanvasAspectPreset) => void; onSafeMarginsChange: (visible: boolean) => void; onFullscreenToggle: () => void; }

export default function VideoPlaybackControls({ currentTime, durationSeconds, isPlaying, isUnavailable, isMuted, zoom, aspectPreset, showSafeMargins, isFullscreen, onPreviousShot, onNextShot, onCurrentTimeChange, onPlayingChange, onMutedChange, onZoomChange, onAspectPresetChange, onSafeMarginsChange, onFullscreenToggle }: VideoPlaybackControlsProps) {
  return <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center" style={{ width: "min(720px,92%)" }}>
    <span className="font-mono editor-micro tabular-nums text-text-muted">
      {formatTimecode(currentTime)} <span className="mx-1.5 text-text-muted/60">/</span> {formatTimecode(durationSeconds)}
    </span>
    <div className="flex items-center justify-center gap-1">
      <Button type="button" variant="ghost" size="icon" aria-label="上一分镜" disabled={isUnavailable} onClick={onPreviousShot} className="text-text-muted hover:bg-white/8 hover:text-white"><SkipBack /></Button>
      <Button type="button" variant="ghost" size="icon" aria-label="后退一帧" disabled={isUnavailable} onClick={() => onCurrentTimeChange(Math.max(0, currentTime - 1 / FRAMES_PER_SECOND))} className="text-text-muted hover:bg-white/8 hover:text-white"><StepBack /></Button>
      <Button type="button" size="icon" aria-label={isPlaying ? "暂停" : "播放"} disabled={isUnavailable} onClick={() => onPlayingChange(!isPlaying)} className="bg-accent/80 text-white hover:bg-accent">{isPlaying ? <Pause /> : <Play />}</Button>
      <Button type="button" variant="ghost" size="icon" aria-label="前进一帧" disabled={isUnavailable} onClick={() => onCurrentTimeChange(Math.min(durationSeconds, currentTime + 1 / FRAMES_PER_SECOND))} className="text-text-muted hover:bg-white/8 hover:text-white"><StepForward /></Button>
      <Button type="button" variant="ghost" size="icon" aria-label="下一分镜" disabled={isUnavailable} onClick={onNextShot} className="text-text-muted hover:bg-white/8 hover:text-white"><SkipForward /></Button>
    </div>
    <div className="flex items-center justify-end gap-0.5">
      <DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="ghost" size="xs" aria-label="预览缩放" className="h-6 gap-1 px-1.5 font-mono editor-meta text-text-muted hover:bg-white/8 hover:text-white" />}><ZoomIn className="size-3" />{Math.round(zoom * 100)}%</DropdownMenuTrigger><DropdownMenuContent align="end" side="top" className="min-w-20 border-border bg-bg-panel"><DropdownMenuRadioGroup value={String(zoom)} onValueChange={(value) => onZoomChange(Number(value))}>{CANVAS_ZOOM_OPTIONS.map((option) => <DropdownMenuRadioItem key={option} value={String(option)} className="h-7 font-mono editor-body text-text-dim">{Math.round(option * 100)}%</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
      <DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="ghost" size="xs" aria-label="画布比例" className="h-6 gap-1 px-1.5 font-mono editor-meta text-text-muted hover:bg-white/8 hover:text-white" />}><Proportions className="size-3" />{aspectPreset.label}</DropdownMenuTrigger><DropdownMenuContent align="end" side="top" className="min-w-32 border-border bg-bg-panel"><DropdownMenuRadioGroup value={aspectPreset.label} onValueChange={(label) => { const preset = CANVAS_ASPECT_PRESETS.find((candidate) => candidate.label === label); if (preset) onAspectPresetChange(preset); }}>{CANVAS_ASPECT_PRESETS.map((preset) => <DropdownMenuRadioItem key={preset.label} value={preset.label} className="flex h-7 items-center justify-between font-mono editor-body text-text-dim"><span>{preset.label}</span><span className="editor-micro text-text-muted">{preset.width}×{preset.height}</span></DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
      <Button type="button" variant="ghost" size="icon-xs" aria-label="显示安全区" aria-pressed={showSafeMargins} onClick={() => onSafeMarginsChange(!showSafeMargins)} className={showSafeMargins ? "bg-accent/20 text-accent hover:bg-accent/25 hover:text-accent" : "text-text-muted hover:bg-white/8 hover:text-white"}><Proportions /></Button>
      <Button type="button" variant="ghost" size="icon-xs" aria-label={isFullscreen ? "退出全屏预览" : "全屏预览"} onClick={onFullscreenToggle} className="text-text-muted hover:bg-white/8 hover:text-white">{isFullscreen ? <Minimize2 /> : <Maximize2 />}</Button>
      <Button type="button" variant="ghost" size="icon-xs" aria-label={isMuted ? "取消静音" : "静音"} disabled={isUnavailable} onClick={() => onMutedChange(!isMuted)} className="text-text-muted hover:text-white">{isMuted ? <VolumeX /> : <Volume2 />}</Button>
    </div>
  </div>;
}
