import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Proportions,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  StepBack,
  StepForward,
  Volume2,
  VolumeX,
  ZoomIn,
} from "lucide-react"
import { useState } from "react"
import { Button } from "../../../components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { FRAMES_PER_SECOND } from "../constants/editor"
import { SPEEDS } from "../constants/editorData"
import formatTimecode from "../utils/formatTimecode"
import {
  CANVAS_ASPECT_PRESETS,
  CANVAS_ZOOM_OPTIONS,
  type CanvasAspectPreset,
} from "./VideoPreviewCanvas"

const CANVAS_BACKGROUND_SWATCHES = [
  "#000000",
  "#FFFFFF",
  "#1E1E1E",
  "#2563EB",
  "#DC2626",
  "#16A34A",
  "#F59E0B",
  "#9333EA",
  "#DB2777",
  "#0EA5E9",
]

interface VideoPlaybackControlsProps {
  currentTime: number
  durationSeconds: number
  isPlaying: boolean
  isUnavailable: boolean
  isMuted: boolean
  speed: number
  canvasBackgroundColor: string | null
  zoom: number
  aspectPreset: CanvasAspectPreset
  showSafeMargins: boolean
  isFullscreen: boolean
  onPreviousShot: () => void
  onNextShot: () => void
  onCurrentTimeChange: (time: number) => void
  onPlayingChange: (isPlaying: boolean) => void
  onMutedChange: (isMuted: boolean) => void
  onSpeedChange: (speed: number) => void
  onCanvasBackgroundColorChange: (color: string | null) => void
  onZoomChange: (zoom: number) => void
  onAspectPresetChange: (preset: CanvasAspectPreset) => void
  onSafeMarginsChange: (visible: boolean) => void
  onFullscreenToggle: () => void
}

export default function VideoPlaybackControls({
  currentTime,
  durationSeconds,
  isPlaying,
  isUnavailable,
  isMuted,
  speed,
  canvasBackgroundColor,
  zoom,
  aspectPreset,
  showSafeMargins,
  isFullscreen,
  onPreviousShot,
  onNextShot,
  onCurrentTimeChange,
  onPlayingChange,
  onMutedChange,
  onSpeedChange,
  onCanvasBackgroundColorChange,
  onZoomChange,
  onAspectPresetChange,
  onSafeMarginsChange,
  onFullscreenToggle,
}: VideoPlaybackControlsProps) {
  const [moreControlsOpen, setMoreControlsOpen] = useState(false)
  const defaultCanvasColor =
    document.documentElement.dataset.theme === "light" ? "#eeede9" : "#050505"

  return (
    <div
      className="relative grid w-full grid-cols-[1fr_auto_1fr] items-center"
      style={{ width: "min(720px,92%)" }}
    >
      <span className="font-mono editor-micro tabular-nums text-text-muted">
        {formatTimecode(currentTime)}
        <span className="mx-1.5 text-text-muted/60">/</span>
        {formatTimecode(durationSeconds)}
      </span>
      <div className="flex items-center justify-center gap-1">
        <Button type="button" variant="ghost" size="icon" aria-label="上一分镜" disabled={isUnavailable} onClick={onPreviousShot} className="text-text-muted hover:bg-white/8 hover:text-white"><SkipBack /></Button>
        <Button type="button" variant="ghost" size="icon" aria-label="后退一帧" disabled={isUnavailable} onClick={() => onCurrentTimeChange(Math.max(0, currentTime - 1 / FRAMES_PER_SECOND))} className="text-text-muted hover:bg-white/8 hover:text-white"><StepBack /></Button>
        <Button type="button" size="icon" aria-label={isPlaying ? "暂停" : "播放"} disabled={isUnavailable} onClick={() => onPlayingChange(!isPlaying)} className="bg-accent/80 text-white hover:bg-accent">{isPlaying ? <Pause /> : <Play />}</Button>
        <Button type="button" variant="ghost" size="icon" aria-label="前进一帧" disabled={isUnavailable} onClick={() => onCurrentTimeChange(Math.min(durationSeconds, currentTime + 1 / FRAMES_PER_SECOND))} className="text-text-muted hover:bg-white/8 hover:text-white"><StepForward /></Button>
        <Button type="button" variant="ghost" size="icon" aria-label="下一分镜" disabled={isUnavailable} onClick={onNextShot} className="text-text-muted hover:bg-white/8 hover:text-white"><SkipForward /></Button>
      </div>
      <div className="relative flex items-center justify-end gap-0.5">
        <DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="ghost" size="xs" aria-label="预览缩放" className="h-6 gap-1 px-1.5 font-mono editor-meta text-text-muted hover:bg-white/8 hover:text-white" />}><ZoomIn className="size-3" />{Math.round(zoom * 100)}%</DropdownMenuTrigger><DropdownMenuContent align="end" side="top" className="min-w-20 border-border bg-bg-panel"><DropdownMenuRadioGroup value={String(zoom)} onValueChange={(value) => onZoomChange(Number(value))}>{CANVAS_ZOOM_OPTIONS.map((option) => <DropdownMenuRadioItem key={option} value={String(option)} className="h-7 font-mono editor-body text-text-dim">{Math.round(option * 100)}%</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
        <DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="ghost" size="xs" aria-label="画布比例" className="h-6 gap-1 px-1.5 font-mono editor-meta text-text-muted hover:bg-white/8 hover:text-white" />}><Proportions className="size-3" />{aspectPreset.label}</DropdownMenuTrigger><DropdownMenuContent align="end" side="top" className="min-w-32 border-border bg-bg-panel"><DropdownMenuRadioGroup value={aspectPreset.label} onValueChange={(label) => { const preset = CANVAS_ASPECT_PRESETS.find((candidate) => candidate.label === label); if (preset) onAspectPresetChange(preset); }}>{CANVAS_ASPECT_PRESETS.map((preset) => <DropdownMenuRadioItem key={preset.label} value={preset.label} className="flex h-7 items-center justify-between font-mono editor-body text-text-dim"><span>{preset.label}</span><span className="editor-micro text-text-muted">{preset.width}×{preset.height}</span></DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
        <Button type="button" variant="ghost" size="icon-xs" aria-label="显示安全区" aria-pressed={showSafeMargins} onClick={() => onSafeMarginsChange(!showSafeMargins)} className={showSafeMargins ? "bg-accent/20 text-accent hover:bg-accent/25 hover:text-accent" : "text-text-muted hover:bg-white/8 hover:text-white"}><Proportions /></Button>
        <Button type="button" variant="ghost" size="icon-xs" aria-label={isFullscreen ? "退出全屏预览" : "全屏预览"} onClick={onFullscreenToggle} className="text-text-muted hover:bg-white/8 hover:text-white">{isFullscreen ? <Minimize2 /> : <Maximize2 />}</Button>
        <Button type="button" variant={moreControlsOpen ? "secondary" : "ghost"} size="icon-xs" aria-label="展开更多视频控制" aria-expanded={moreControlsOpen} onClick={() => setMoreControlsOpen((open) => !open)} className="text-text-muted hover:bg-white/8 hover:text-white">{moreControlsOpen ? <ChevronDown /> : <SlidersHorizontal />}</Button>

        {moreControlsOpen && (
          <div role="region" aria-label="更多视频控制" className="absolute bottom-8 right-0 z-20 max-h-[min(70vh,24rem)] w-60 overflow-y-auto rounded-xl border border-border bg-bg-panel p-3 text-text-base shadow-xl">
            <div className="flex items-center justify-between">
              <p className="editor-heading font-mono text-text-muted">更多控制</p>
              <Button type="button" variant="ghost" size="icon-xs" aria-label="收起更多视频控制" onClick={() => setMoreControlsOpen(false)} className="text-text-muted hover:text-white"><ChevronUp /></Button>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="editor-body text-text-muted">声音</span>
              <Button type="button" variant="outline" size="sm" aria-label={isMuted ? "取消静音" : "静音"} disabled={isUnavailable} onClick={() => onMutedChange(!isMuted)} className="h-7 gap-1.5 border-border text-text-muted hover:text-white">{isMuted ? <VolumeX /> : <Volume2 />}{isMuted ? "取消静音" : "静音"}</Button>
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <p className="editor-heading font-mono text-text-muted">播放倍速</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {SPEEDS.map((option) => (
                  <Button key={option} type="button" variant="outline" size="sm" onClick={() => onSpeedChange(option)} className={`h-7 font-mono editor-body font-normal ${speed === option ? "border-accent/50 bg-accent/15 text-accent" : "border-border text-text-muted hover:border-border-mid hover:text-white"}`}>
                    {option}×
                  </Button>
                ))}
              </div>
              <p className="mt-2 editor-meta text-text-muted">当前：<span className="font-mono text-accent">{speed}×</span></p>
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <p className="editor-heading font-mono text-text-muted">画布背景</p>
              <button type="button" onClick={() => onCanvasBackgroundColorChange(null)} aria-pressed={canvasBackgroundColor === null} className={`mt-2 flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left editor-body ${canvasBackgroundColor === null ? "bg-accent/15 text-accent" : "text-text-dim hover:bg-white/6 hover:text-white"}`}>
                <span className="size-3 rounded-sm border border-white/20" style={{ backgroundColor: defaultCanvasColor }} />
                主题默认
              </button>
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {CANVAS_BACKGROUND_SWATCHES.map((color) => (
                  <button key={color} type="button" aria-label={`画布背景 ${color}`} aria-pressed={canvasBackgroundColor?.toLowerCase() === color.toLowerCase()} onClick={() => onCanvasBackgroundColorChange(color)} className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${canvasBackgroundColor?.toLowerCase() === color.toLowerCase() ? "scale-110 border-accent" : "border-white/20"}`} style={{ backgroundColor: color }} />
                ))}
              </div>
              <label className="mt-3 flex items-center justify-between border-t border-border pt-2 editor-meta text-text-muted">
                自定义颜色
                <input type="color" aria-label="自定义画布背景色" value={canvasBackgroundColor ?? defaultCanvasColor} onChange={(event) => onCanvasBackgroundColorChange(event.target.value)} className="editor-color-input size-6 cursor-pointer p-0" />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
