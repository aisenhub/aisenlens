import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { clampWorkspacePanelWidth, resolveKeyboardResizedPanelWidth, resolvePointerResizedPanelWidth } from "../services/workspacePanelGeometry.ts"

interface ResizableWorkspacePanelProps {
  side: "left" | "right"
  width: number
  defaultWidth: number
  minWidth: number
  maxWidth: number
  onWidthCommit: (width: number) => void
  ariaLabel: string
  className?: string
  children: ReactNode
}

export default function ResizableWorkspacePanel({
  side,
  width,
  defaultWidth,
  minWidth,
  maxWidth,
  onWidthCommit,
  ariaLabel,
  className = "",
  children,
}: ResizableWorkspacePanelProps) {
  const [liveWidth, setLiveWidth] = useState(() => clampWorkspacePanelWidth(width, minWidth, maxWidth))
  const dragRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null)
  const frameRef = useRef<number | null>(null)
  const pendingWidthRef = useRef(liveWidth)

  useEffect(() => {
    if (!dragRef.current) {
      const next = clampWorkspacePanelWidth(width, minWidth, maxWidth)
      pendingWidthRef.current = next
      setLiveWidth(next)
    }
  }, [maxWidth, minWidth, width])

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
  }, [])

  const scheduleWidth = (next: number) => {
    pendingWidthRef.current = clampWorkspacePanelWidth(next, minWidth, maxWidth)
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      setLiveWidth(pendingWidthRef.current)
    })
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: liveWidth }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const delta = event.clientX - drag.startX
    scheduleWidth(resolvePointerResizedPanelWidth({ side, startWidth: drag.startWidth, deltaX: delta, minWidth, maxWidth }))
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
      const next = clampWorkspacePanelWidth(pendingWidthRef.current, minWidth, maxWidth)
      setLiveWidth(next)
      onWidthCommit(next)
    } else {
      const next = clampWorkspacePanelWidth(width, minWidth, maxWidth)
      pendingWidthRef.current = next
      setLiveWidth(next)
    }
  }

  const handleKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const next = resolveKeyboardResizedPanelWidth({
      key: event.key,
      side,
      currentWidth: liveWidth,
      defaultWidth,
      minWidth,
      maxWidth,
    })
    if (next === null) return
    event.preventDefault()
    pendingWidthRef.current = next
    setLiveWidth(next)
    onWidthCommit(next)
  }

  const style = { "--native-panel-width": `${liveWidth}px` } as CSSProperties
  const handleSideClass = side === "left" ? "right-[-3px]" : "left-[-3px]"

  return (
    <section className={`native-resizable-panel relative min-w-0 shrink-0 ${className}`} style={style}>
      {children}
      <div
        role="separator"
        aria-label={ariaLabel}
        aria-orientation="vertical"
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        aria-valuenow={Math.round(liveWidth)}
        tabIndex={0}
        title={`${ariaLabel} · 双击恢复默认`}
        className={`native-panel-resize-handle absolute top-0 bottom-0 ${handleSideClass} w-[6px] cursor-col-resize`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => finishDrag(event, true)}
        onPointerCancel={(event) => finishDrag(event, false)}
        onDoubleClick={() => {
          const next = clampWorkspacePanelWidth(defaultWidth, minWidth, maxWidth)
          pendingWidthRef.current = next
          setLiveWidth(next)
          onWidthCommit(next)
        }}
        onKeyDown={handleKeyboard}
      />
    </section>
  )
}
