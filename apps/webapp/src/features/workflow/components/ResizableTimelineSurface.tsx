import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import {
  clampWorkspacePanelWidth,
  resolveKeyboardResizedTimelineHeight,
  resolvePointerResizedTimelineHeight,
} from "../services/workspacePanelGeometry.ts"

interface ResizableTimelineSurfaceProps {
  height: number
  extraHeight?: number
  defaultHeight: number
  minHeight: number
  maxHeight: number
  onHeightCommit: (height: number) => void
  children: ReactNode
}

export default function ResizableTimelineSurface({
  height,
  extraHeight = 0,
  defaultHeight,
  minHeight,
  maxHeight,
  onHeightCommit,
  children,
}: ResizableTimelineSurfaceProps) {
  const [liveHeight, setLiveHeight] = useState(() => clampWorkspacePanelWidth(height, minHeight, maxHeight))
  const dragRef = useRef<{ pointerId: number; startY: number; startHeight: number } | null>(null)
  const pendingHeightRef = useRef(liveHeight)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!dragRef.current) {
      const next = clampWorkspacePanelWidth(height, minHeight, maxHeight)
      pendingHeightRef.current = next
      setLiveHeight(next)
    }
  }, [height, maxHeight, minHeight])

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
  }, [])

  const scheduleHeight = (next: number) => {
    pendingHeightRef.current = clampWorkspacePanelWidth(next, minHeight, maxHeight)
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      setLiveHeight(pendingHeightRef.current)
    })
  }

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>, commit: boolean) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (commit) {
      const next = clampWorkspacePanelWidth(pendingHeightRef.current, minHeight, maxHeight)
      setLiveHeight(next)
      onHeightCommit(next)
    } else {
      const next = clampWorkspacePanelWidth(height, minHeight, maxHeight)
      pendingHeightRef.current = next
      setLiveHeight(next)
    }
  }

  return (
    <section
      className="native-resizable-timeline relative min-h-0 shrink-0"
      style={{ height: liveHeight + extraHeight }}
    >
      <div
        role="separator"
        aria-label="调整时间线高度"
        aria-orientation="horizontal"
        aria-valuemin={minHeight}
        aria-valuemax={maxHeight}
        aria-valuenow={Math.round(liveHeight)}
        tabIndex={0}
        title="调整时间线高度 · 双击恢复默认"
        className="native-timeline-resize-handle absolute -top-[3px] inset-x-0 z-[var(--z-sticky)] hidden h-[6px] cursor-row-resize outline-none"
        onPointerDown={(event) => {
          event.preventDefault()
          event.currentTarget.setPointerCapture(event.pointerId)
          dragRef.current = { pointerId: event.pointerId, startY: event.clientY, startHeight: liveHeight }
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current
          if (!drag || drag.pointerId !== event.pointerId) return
          scheduleHeight(resolvePointerResizedTimelineHeight({
            startHeight: drag.startHeight,
            deltaY: event.clientY - drag.startY,
            minHeight,
            maxHeight,
          }))
        }}
        onPointerUp={(event) => finishDrag(event, true)}
        onPointerCancel={(event) => finishDrag(event, false)}
        onDoubleClick={() => {
          const next = clampWorkspacePanelWidth(defaultHeight, minHeight, maxHeight)
          pendingHeightRef.current = next
          setLiveHeight(next)
          onHeightCommit(next)
        }}
        onKeyDown={(event) => {
          const next = resolveKeyboardResizedTimelineHeight({
            key: event.key,
            currentHeight: liveHeight,
            defaultHeight,
            minHeight,
            maxHeight,
          })
          if (next === null) return
          event.preventDefault()
          pendingHeightRef.current = next
          setLiveHeight(next)
          onHeightCommit(next)
        }}
      />
      <div className="h-full min-h-0">{children}</div>
    </section>
  )
}
