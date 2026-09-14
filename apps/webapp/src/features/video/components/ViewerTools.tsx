import { Button } from "../../../components/ui/button"

interface ViewerToolsProps { onOpenLegacyTools?: () => void }

export default function ViewerTools({ onOpenLegacyTools }: ViewerToolsProps) {
  return <div className="flex items-center justify-between border-t border-border bg-bg-panel px-3 py-2"><span className="text-xs text-text-muted">Viewer Tools · 构图蒙版与叠层沿用现有导出语义</span>{onOpenLegacyTools && <Button type="button" variant="outline" size="xs" onClick={onOpenLegacyTools}>打开工具</Button>}</div>
}
