import { Maximize2, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "../../../components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../components/ui/tooltip"

interface TimelineControlsProps {
  canUndo: boolean
  canRedo: boolean
  zoom: number
  canZoomOut: boolean
  canZoomIn: boolean
  onUndo: () => void
  onRedo: () => void
  onZoomOut: () => void
  onZoomIn: () => void
  onFitToFilm: () => void
}

const controlButtonClassName = "size-7 text-text-muted hover:bg-white/6 hover:text-text-base"

function TimelineControlButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onClick}
            className={controlButtonClassName}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export default function TimelineControls({
  canUndo,
  canRedo,
  zoom,
  canZoomOut,
  canZoomIn,
  onUndo,
  onRedo,
  onZoomOut,
  onZoomIn,
  onFitToFilm,
}: TimelineControlsProps) {
  const zoomPercent = Math.round(Math.max(1, zoom) * 100)

  return (
    <div
      aria-label="时间轴控制栏"
      className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-border bg-bg-panel px-3"
    >
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
        时间轴
      </span>
      <div className="flex min-w-0 items-center gap-2">
        <div
          role="group"
          aria-label="编辑历史"
          className="flex items-center gap-0.5 rounded-md border border-border/70 bg-bg-input/20 p-0.5"
        >
          <TimelineControlButton label="撤销" disabled={!canUndo} onClick={onUndo}>
            <Undo2 />
          </TimelineControlButton>
          <TimelineControlButton label="重做" disabled={!canRedo} onClick={onRedo}>
            <Redo2 />
          </TimelineControlButton>
        </div>
        <div
          role="group"
          aria-label="时间轴缩放"
          className="flex items-center gap-0.5 rounded-md border border-border/70 bg-bg-input/20 p-0.5"
        >
          <TimelineControlButton label="缩小时间轴" disabled={!canZoomOut} onClick={onZoomOut}>
            <ZoomOut />
          </TimelineControlButton>
          <span
            aria-live="polite"
            className="min-w-12 px-1 text-center font-mono text-[10px] tabular-nums text-text-dim"
          >
            {zoomPercent}%
          </span>
          <TimelineControlButton label="放大时间轴" disabled={!canZoomIn} onClick={onZoomIn}>
            <ZoomIn />
          </TimelineControlButton>
        </div>
        <TimelineControlButton label="适配全片" onClick={onFitToFilm}>
          <Maximize2 />
        </TimelineControlButton>
      </div>
    </div>
  )
}
