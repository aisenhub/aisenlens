export type WorkspacePanelSide = "left" | "right"
export type WorkspacePanelResizeKey = "ArrowLeft" | "ArrowRight" | "Home"

export const clampWorkspacePanelWidth = (value: number, minWidth: number, maxWidth: number) =>
  Math.min(maxWidth, Math.max(minWidth, value))

export const resolvePointerResizedPanelWidth = ({
  side,
  startWidth,
  deltaX,
  minWidth,
  maxWidth,
}: {
  side: WorkspacePanelSide
  startWidth: number
  deltaX: number
  minWidth: number
  maxWidth: number
}) =>
  clampWorkspacePanelWidth(
    startWidth + (side === "left" ? deltaX : -deltaX),
    minWidth,
    maxWidth,
  )

export const resolveKeyboardResizedPanelWidth = ({
  key,
  side,
  currentWidth,
  defaultWidth,
  minWidth,
  maxWidth,
  step = 8,
}: {
  key: string
  side: WorkspacePanelSide
  currentWidth: number
  defaultWidth: number
  minWidth: number
  maxWidth: number
  step?: number
}): number | null => {
  if (key === "Home") return clampWorkspacePanelWidth(defaultWidth, minWidth, maxWidth)
  if (key !== "ArrowLeft" && key !== "ArrowRight") return null
  const direction =
    side === "left"
      ? key === "ArrowRight" ? 1 : -1
      : key === "ArrowLeft" ? 1 : -1
  return clampWorkspacePanelWidth(currentWidth + direction * step, minWidth, maxWidth)
}

export const resolvePointerResizedTimelineHeight = ({
  startHeight,
  deltaY,
  minHeight,
  maxHeight,
}: {
  startHeight: number
  deltaY: number
  minHeight: number
  maxHeight: number
}) => clampWorkspacePanelWidth(startHeight - deltaY, minHeight, maxHeight)

export const resolveKeyboardResizedTimelineHeight = ({
  key,
  currentHeight,
  defaultHeight,
  minHeight,
  maxHeight,
  step = 8,
}: {
  key: string
  currentHeight: number
  defaultHeight: number
  minHeight: number
  maxHeight: number
  step?: number
}): number | null => {
  if (key === "Home") return clampWorkspacePanelWidth(defaultHeight, minHeight, maxHeight)
  if (key !== "ArrowUp" && key !== "ArrowDown") return null
  return clampWorkspacePanelWidth(currentHeight + (key === "ArrowUp" ? step : -step), minHeight, maxHeight)
}
