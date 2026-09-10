import { ArrowRight, FileCog, Map, RefreshCw, Settings2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "../../../components/ui/button"
import AutoShotControlPanel from "../../auto-shot/components/AutoShotControlPanel"
import AutoShotResultDialog from "../../auto-shot/components/AutoShotResultDialog"
import type { AutoShotControlSettings, AutoShotPresetDefinition, ResolvedAutoShotConfiguration } from "../../auto-shot/config/types"
import type { AutoShotCandidate, AutoShotTaskRecord } from "../../auto-shot/types"
import MediaStatusPanel from "../../project/components/MediaStatusPanel"
import type { MediaAsset, ProjectRecord } from "../../project/types"

interface PrepareViewProps {
  project: ProjectRecord
  media: MediaAsset
  videoUrl: string | null
  isSelectingVideo: boolean
  onImportVideo: () => void
  onGoToAnalyze: () => void
  onGoToCalibrate: () => Promise<void>
  onOpenSettings: () => void
  settings: AutoShotControlSettings | null
  resolved: ResolvedAutoShotConfiguration | null
  presets: AutoShotPresetDefinition[]
  record: AutoShotTaskRecord | null
  isActive: boolean
  error: string | null
  onChange: (patch: Partial<AutoShotControlSettings>) => void
  onStart: () => void
  onPause: () => void
  onRestart: () => void
}

export default function PrepareView({ project, media, videoUrl, isSelectingVideo, onImportVideo, onGoToAnalyze, onGoToCalibrate, onOpenSettings, settings, resolved, presets, record, isActive, error, onChange, onStart, onPause, onRestart }: PrepareViewProps) {
  const [isAutoShotDialogOpen, setIsAutoShotDialogOpen] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const applyDetection = async () => {
    if (isApplying) return
    setIsApplying(true)
    try {
      await onGoToCalibrate()
      setIsAutoShotDialogOpen(false)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "无法准备校准草稿，请重试。")
    } finally {
      setIsApplying(false)
    }
  }
  const isRunning = isActive || record?.status === "running"
  const canRestart = Boolean(record && record.status !== "paused" && record.status !== "running")
  const scanActionLabel = record?.status === "completed" ? "重新扫描" : isRunning ? "查看扫描进度" : record?.status === "paused" ? "继续扫描" : "开始自动分镜"

  const openAutoShotDialog = () => {
    setIsAutoShotDialogOpen(true)
    if (isRunning) return
    if (canRestart) onRestart()
    else onStart()
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-bg px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">Prepare</p><h1 className="mt-1 text-xl font-semibold text-text-base">准备素材与镜头地图</h1><p className="mt-2 text-sm text-text-muted">{project.title} · 先确认真实素材，再运行检测。</p></div>
          <Button type="button" size="sm" onClick={onGoToAnalyze} className="gap-2 bg-accent text-white hover:bg-accent/90">进入深拆<ArrowRight className="size-4" /></Button>
        </div>
        <div className="space-y-4">
          <MediaStatusPanel media={media} videoUrl={videoUrl} isSelectingVideo={isSelectingVideo} onImportVideo={onImportVideo} />
          <section className="border border-border bg-bg-panel p-4">
            <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-sm font-medium text-text-base">研究模板</h2><p className="mt-1 text-xs leading-5 text-text-muted">沿用当前项目模板与自定义字段，不新增未保存的研究意图。</p></div><Button type="button" variant="outline" size="sm" onClick={onOpenSettings} className="gap-2 border-border text-text-dim"><Settings2 className="size-3.5" />模板设置</Button></div>
            <div className="flex items-center gap-3 border-t border-border pt-3 text-xs text-text-dim"><FileCog className="size-4 text-text-muted" /><span>{settings ? `当前预设：${settings.presetId}` : "正在读取当前视频配置…"}</span><span className="ml-auto font-mono text-text-muted">{record?.status === "completed" ? "已完成一次扫描" : "尚未扫描"}</span></div>
          </section>
          <section className="border border-border bg-bg-panel p-4"><div className="mb-4 flex items-start gap-3"><Map className="mt-0.5 size-4 text-accent" /><div><h2 className="text-sm font-medium text-text-base">建立镜头地图</h2><p className="mt-1 text-xs leading-5 text-text-muted">自动分镜只提出候选区间；应用前会在校准阶段复核并创建恢复快照。</p></div></div><AutoShotControlPanel settings={settings} resolved={resolved} presets={presets} record={record} isActive={isActive} error={error} showRunStatus={false} onChange={onChange} onStart={onStart} onPause={onPause} onRestart={onRestart} /><Button type="button" size="sm" disabled={!resolved} onClick={openAutoShotDialog} className="mt-3 h-9 w-full gap-2 bg-accent text-white hover:bg-accent/90"><RefreshCw className="size-3.5" />{scanActionLabel}</Button></section>
        </div>
      </div>
      <AutoShotResultDialog open={isAutoShotDialogOpen} onOpenChange={setIsAutoShotDialogOpen} record={record} frameRate={media.metadata?.frameRate ?? 30} isActive={isActive} error={error} resolved={resolved} onStart={onStart} onPause={onPause} onRestart={onRestart} isApplying={isApplying} onApply={() => void applyDetection()} />
    </main>
  )
}
